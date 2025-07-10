
# NOTE: Run this backend as a module from the mywork directory:
#   python -m backend.app
# This ensures all imports work correctly.
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from config import config
from utils import validate_room_data, save_uploaded_file, allowed_file
from database import (
    init_database, create_user, get_user_by_username, get_user_by_id,
    save_room, get_user_rooms, get_room_by_id, update_room, delete_room
)

app = Flask(__name__)
app.config.from_object(config['development'])
CORS(app, supports_credentials=True)

# Data storage
WALLPAPERS_DIR = 'wallpapers'

def ensure_directories():
    os.makedirs(WALLPAPERS_DIR, exist_ok=True)

# Authentication endpoints
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Register a new user"""
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    # Validate required fields
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    # Create new user
    password_hash = generate_password_hash(data['password'])
    user = create_user(data['username'], data['email'], password_hash) if data else None
    if not user:
        return jsonify({'error': 'Username or email already exists'}), 400
    # Set session
    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    }), 201

@app.route('/api/signup', methods=['POST'])
def signup_alias():
    """Alias for /api/auth/signup"""
    return signup()

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    user = get_user_by_username(data['username']) if data else None
    if not user or not check_password_hash(user['password_hash'], data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    # Set session
    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    })

@app.route('/api/login', methods=['POST'])
def login_alias():
    """Alias for /api/auth/login"""
    return login()

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'message': 'Logout successful'})

@app.route('/api/logout', methods=['POST'])
def logout_alias():
    """Alias for /api/auth/logout"""
    return logout()

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current user info"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = get_user_by_id(session['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    })

@app.route('/api/me', methods=['GET'])
def get_current_user_alias():
    """Alias for /api/auth/me"""
    return get_current_user()

# Middleware to check authentication for protected routes
def require_auth():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    return None

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    """Get all saved rooms for the current user"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    rooms = get_user_rooms(session['user_id'])
    return jsonify(rooms)

@app.route('/api/rooms', methods=['POST'])
def save_room_design():
    """Save a new room design"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    # Validate room data
    is_valid, message = validate_room_data(data)
    if not is_valid:
        return jsonify({'error': message}), 400
    # Save room to database
    room_id = save_room(
        user_id=session['user_id'],
        name=data.get('name', f'Room {datetime.now().strftime("%Y%m%d_%H%M%S")}'),
        room_type=data.get('roomType', 'others'),
        dimensions=data.get('dimensions', {'length': 8, 'width': 8, 'height': 3}),
        wall_colors=data.get('wallColors', {
            'North Wall': '#b0b0b0',
            'South Wall': '#b0b0b0',
            'East Wall': '#8a7b94',
            'West Wall': '#8a7b94'
        }),
        wallpapers=data.get('wallpapers', {}),
        wall_canvas_data=data.get('wallCanvasData', {})
    )
    # Get the saved room to return
    room = get_room_by_id(room_id, session['user_id'])
    return jsonify({'message': 'Room saved successfully', 'room': room}), 201

@app.route('/api/rooms/<int:room_id>', methods=['PUT'])
def update_room_design(room_id):
    """Update an existing room"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    # Update room in database
    update_data = {}
    if 'name' in data:
        update_data['name'] = data['name']
    if 'roomType' in data:
        update_data['room_type'] = data['roomType']
    if 'dimensions' in data:
        update_data['dimensions'] = data['dimensions']
    if 'wallColors' in data:
        update_data['wall_colors'] = data['wallColors']
    if 'wallpapers' in data:
        update_data['wallpapers'] = data['wallpapers']
    if 'wallCanvasData' in data:
        update_data['wall_canvas_data'] = data['wallCanvasData']
    update_room(room_id, session['user_id'], **update_data)
    # Get the updated room
    room = get_room_by_id(room_id, session['user_id'])
    if room:
        return jsonify({'message': 'Room updated successfully', 'room': room})
    else:
        return jsonify({'error': 'Room not found or access denied'}), 404

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
def delete_room_design(room_id):
    """Delete a room"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    delete_room(room_id, session['user_id'])
    return jsonify({'message': 'Room deleted successfully'})

@app.route('/api/rooms/<int:room_id>', methods=['GET'])
def get_room_design(room_id):
    """Get a specific room"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    room = get_room_by_id(room_id, session['user_id'])
    
    if room:
        return jsonify(room)
    else:
        return jsonify({'error': 'Room not found'}), 404

@app.route('/api/wallpapers', methods=['POST'])
def upload_wallpaper():
    """Upload a wallpaper image"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    if 'wallpaper' not in request.files:
        return jsonify({'error': 'No wallpaper file provided'}), 400
    
    file = request.files['wallpaper']
    wall_name = request.form.get('wallName', 'default')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filename = save_uploaded_file(file, WALLPAPERS_DIR, f"{session['user_id']}_{wall_name}")
    
    if filename:
        return jsonify({
            'message': 'Wallpaper uploaded successfully',
            'filename': filename,
            'url': f'/api/wallpapers/{filename}'
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/wallpapers/<filename>')
def get_wallpaper(filename):
    """Serve wallpaper images"""
    from flask import send_from_directory
    return send_from_directory(WALLPAPERS_DIR, filename)

@app.route('/api/wallpapers', methods=['GET'])
def list_wallpapers():
    """List all available wallpapers for the current user"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    if not os.path.exists(WALLPAPERS_DIR):
        return jsonify([])
    
    wallpapers = []
    user_prefix = f"{session['user_id']}_"
    
    for filename in os.listdir(WALLPAPERS_DIR):
        if filename.startswith(user_prefix) and filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            wallpapers.append({
                'filename': filename,
                'url': f'/api/wallpapers/{filename}'
            })
    
    return jsonify(wallpapers)

@app.route('/api/export/<int:room_id>')
def export_room(room_id):
    """Export room data as JSON"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    room = get_room_by_id(room_id, session['user_id'])
    
    if room:
        return jsonify(room)
    else:
        return jsonify({'error': 'Room not found'}), 404

@app.route('/api/room-templates')
def get_room_templates():
    """Get predefined room templates"""
    templates = [
        {
            'name': 'Small Bedroom',
            'roomType': 'bedroom',
            'dimensions': {'length': 6, 'width': 6, 'height': 3},
            'wallColors': {
                'North Wall': '#e6e2d3',
                'South Wall': '#e6e2d3',
                'East Wall': '#d4c5b9',
                'West Wall': '#d4c5b9'
            }
        },
        {
            'name': 'Modern Living Room',
            'roomType': 'livingroom',
            'dimensions': {'length': 10, 'width': 8, 'height': 3.5},
            'wallColors': {
                'North Wall': '#f5f5f5',
                'South Wall': '#f5f5f5',
                'East Wall': '#e8e8e8',
                'West Wall': '#e8e8e8'
            }
        },
        {
            'name': 'Kitchen Space',
            'roomType': 'kitchen',
            'dimensions': {'length': 8, 'width': 6, 'height': 3},
            'wallColors': {
                'North Wall': '#ffffff',
                'South Wall': '#ffffff',
                'East Wall': '#f9f9f9',
                'West Wall': '#f9f9f9'
            }
        }
    ]
    return jsonify(templates)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    ensure_directories()
    init_database()  # Initialize database on startup
    app.run(host='0.0.0.0', port=5000, debug=True)
