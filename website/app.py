#!/usr/bin/env python3
"""
Simple Flask app to serve Hunter Autoworks website
"""

from flask import Flask, send_from_directory
import os

app = Flask(__name__)

# Set the directory where our HTML files are located
WEBSITE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    return send_from_directory(WEBSITE_DIR, 'index.html')

@app.route('/booking.html')
def booking():
    return send_from_directory(WEBSITE_DIR, 'booking.html')

@app.route('/admin/')
@app.route('/admin/index.html')
def admin():
    return send_from_directory(os.path.join(WEBSITE_DIR, 'admin'), 'index.html')

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory(WEBSITE_DIR, filename)

if __name__ == '__main__':
    print("🚀 Starting Hunter Autoworks Website Server...")
    print("📍 Website URL: http://localhost:8080")
    print("🔧 Main Page: http://localhost:8080")
    print("📋 Booking Page: http://localhost:8080/booking.html")
    print("👨‍💼 Admin Page: http://localhost:8080/admin/")
    print("\n💡 Note: Backend API is not running, so the website will use fallback data.")
    print("   To test with full functionality, start the backend server on port 5000.\n")
    
    app.run(host='0.0.0.0', port=8080, debug=True)
