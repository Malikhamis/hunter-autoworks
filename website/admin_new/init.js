// Minimal adapter for the new admin_new UI to work with existing admin.js logic
// Provides: showLogin(), showDashboard(), setupEventListeners() wiring used previously

function showDashboard() {
  const lc = document.getElementById('loginContainer'); if (lc) lc.hidden = true;
  const dash = document.getElementById('dashboard'); if (dash) dash.style.display = 'block';
}
function showLogin() {
  const lc = document.getElementById('loginContainer'); if (lc) lc.hidden = false;
  const dash = document.getElementById('dashboard'); if (dash) dash.style.display = 'none';
}
function showLoginError(msg){ const el = document.getElementById('loginError'); if(!el) return; el.textContent=msg; el.style.display='block'; setTimeout(()=>el.style.display='none',4000); }

function checkAuth(){ if (localStorage.getItem('admin_jwt')) showDashboard(); else showLogin(); }

function setupEventListeners(){
  const lf = document.getElementById('loginForm'); if (lf) lf.addEventListener('submit', async function(e){ e.preventDefault(); const username = document.getElementById('username').value; const password = document.getElementById('password').value; if (typeof window.adminLogin === 'function') { await window.adminLogin(username,password); checkAuth(); } });
  const lb = document.getElementById('logoutBtn'); if (lb) lb.addEventListener('click', function(){ if (typeof window.adminLogout === 'function') { window.adminLogout(); } checkAuth(); });

  // Hook nav items to simple tab switch for new layout (keeps compatibility with admin.js which loads content into #dashboard area)
  document.querySelectorAll('.ha-nav-item').forEach(a=>a.addEventListener('click',(e)=>{ e.preventDefault(); document.querySelectorAll('.ha-nav-item').forEach(x=>x.classList.remove('active')); a.classList.add('active'); const t=a.getAttribute('data-target'); if(t) showTab(t); }));
}

function showTab(id){ document.querySelectorAll('.tab-content, .ha-panel').forEach(x=>x.classList.remove('active')); const el = document.getElementById(id); if(el) el.classList.add('active'); }

window.showDashboard = showDashboard; window.showLogin = showLogin; window.showLoginError = showLoginError; window.checkAuth = checkAuth; window.setupEventListeners = setupEventListeners; window.showTab = showTab;

// Init on DOM load
document.addEventListener('DOMContentLoaded', ()=>{ checkAuth(); setupEventListeners(); try { if (typeof loadBookings === 'function') loadBookings(); if (typeof loadAnalytics === 'function') loadAnalytics(); } catch(e){ console.warn('Adapter init failed to call optional loaders', e); } });
