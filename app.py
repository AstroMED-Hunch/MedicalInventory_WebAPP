"""
To run: python app.py
Then access: http://localhost:5000
"""

from flask import Flask, render_template, jsonify, request, session
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'nasa-hunch-2024-secret-key'  # Change this in production!
CORS(app)  # Allow cross-origin requests

# Simple password check (for prototype)
# NOTE: This is hardcoded for prototype demonstration only
# In production, this would authenticate against a database
CORRECT_PASSWORD = "67"  # Match the JavaScript password

@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    """Simple login endpoint"""
    data = request.json
    password = data.get('password', '')
    
    if password == CORRECT_PASSWORD:
        session['authenticated'] = True
        return jsonify({'success': True, 'message': 'Authentication successful'})
    else:
        return jsonify({'success': False, 'message': 'Invalid password'}), 401

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Return usage logs from logs.json"""
    if not session.get('authenticated'):
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        with open('logs.json', 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({'logs': []})

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    """Return AI predictions from predictions.json"""
    if not session.get('authenticated'):
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        with open('predictions.json', 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({'predictions': []})

@app.route('/api/log', methods=['POST'])
def add_log():
    """Add a new usage log entry (simulates camera detection)"""
    if not session.get('authenticated'):
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    # In a real system, this would save to a database
    # For now, just return success
    return jsonify({'success': True, 'message': 'Log entry recorded'})

if __name__ == '__main__':
    # Run on all interfaces, port 5000
    # For Jetson Nano, you might want to use a specific IP
    app.run(host='0.0.0.0', port=5000, debug=True)

