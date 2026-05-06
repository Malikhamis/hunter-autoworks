/**
 * api.js — Centralized API client for Hunter Autoworks Admin Dashboard
 * All fetch calls go through this module for consistent auth, error handling, and auto-logout.
 */

(function () {
  'use strict';

  // Auto-detect API base URL
  const API_BASE =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5001/api'
      : 'https://hunter-autoworks-backend.onrender.com/api';

  /**
   * Core fetch wrapper.
   * - Attaches Authorization header if JWT exists in localStorage
   * - Auto-logouts on 401/403
   * - Throws Error with server message on non-OK responses
   */
  async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('admin_jwt');

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {})
    };

    let res;
    try {
      res = await fetch(API_BASE + path, { ...options, headers });
    } catch (networkErr) {
      throw new Error('Network error — check your connection and try again.');
    }

    // Auto-logout on auth failure
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('admin_jwt');
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/admin/') {
        window.location.href = 'index.html';
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Authentication required');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    // Handle 204 No Content
    if (res.status === 204) return null;

    return res.json();
  }

  /**
   * Public API object — use these methods everywhere instead of raw fetch()
   */
  window.api = {
    /** GET request */
    get(path) {
      return apiFetch(path, { method: 'GET' });
    },

    /** POST request with JSON body */
    post(path, body) {
      return apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    /** PUT request with JSON body */
    put(path, body) {
      return apiFetch(path, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    },

    /** DELETE request */
    delete(path) {
      return apiFetch(path, { method: 'DELETE' });
    },

    /** Expose base URL for direct use if needed */
    BASE: API_BASE
  };

  // Also expose as module-level constant for backward compat with admin.js
  window.API_BASE = API_BASE;

})();
