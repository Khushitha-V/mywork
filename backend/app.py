
# NOTE: Run this backend as a module from the mywork directory:
#   python -m backend.app
# This ensures all imports work correctly.
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from utils import validate_room_data, save_uploaded_file, allowed_file
from database import create_user, get_user_by_username, get_user_by_id, save_room, get_user_rooms, get_room_by_id, update_room, delete_room, save_signup_otp, get_signup_otp, delete_signup_otp
from bson import ObjectId
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import random
import time
import re
from dotenv import load_dotenv
load_dotenv()

# In-memory OTP store: {email: (otp, expiry_time)}
otp_store = {}
# In-memory OTP store for signup: {email: (otp, expiry_time)}
signup_otp_store = {}
SENDGRID_TEMPLATE_ID = os.environ.get('SENDGRID_TEMPLATE_ID')
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
GMAIL_USER = os.environ.get('GMAIL_USER')
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD')
SENDER_EMAIL = GMAIL_USER  # Use your Gmail as the sender

app = Flask(__name__)
app.secret_key = "your-very-secret-key"  # Use a strong, random value in production!
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

# Data storage
WALLPAPERS_DIR = 'wallpapers'

def ensure_directories():
    os.makedirs(WALLPAPERS_DIR, exist_ok=True)

def convert_objectid(obj):
    if isinstance(obj, dict):
        return {k: convert_objectid(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid(i) for i in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    else:
        return obj

# Authentication endpoints
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    email = data.get('email')
    otp = data.get('otp')
    if not username or not password or not confirm_password or not email or not otp:
        return jsonify({'error': 'All fields are required'}), 400
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400
    if not is_valid_password(password):
        return jsonify({'error': 'Password does not meet constraints'}), 400
    # Check OTP from DB
    otp_doc = get_signup_otp(email)
    if not otp_doc or otp_doc['otp'] != otp or time.time() > otp_doc['expiry']:
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    # Check if email is already registered
    if get_user_by_username(email) or get_user_by_id(email):
        return jsonify({'error': 'Email already registered'}), 400
    # Create user
    user = create_user(username, password, email)
    delete_signup_otp(email)
    return jsonify({'user': convert_objectid(user)})



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
    rooms = [convert_objectid(room) for room in rooms]
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
        wall_canvas_data=data.get('wallCanvasData', {}),
        walls=data.get('walls', {})
    )
    # Get the saved room to return
    room = get_room_by_id(room_id, session['user_id'])
    room = convert_objectid(room)
    return jsonify({'message': 'Room saved successfully', 'room': room}), 201

@app.route('/api/rooms/<room_id>', methods=['PUT'])
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
    room = convert_objectid(room)
    if room:
        return jsonify({'message': 'Room updated successfully', 'room': room})
    else:
        return jsonify({'error': 'Room not found or access denied'}), 404

@app.route('/api/rooms/<room_id>', methods=['DELETE'])
def delete_room_design(room_id):
    """Delete a room"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    delete_room(room_id, session['user_id'])
    return jsonify({'message': 'Room deleted successfully'})

@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room_design(room_id):
    """Get a specific room"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    room = get_room_by_id(room_id, session['user_id'])
    room = convert_objectid(room)
    
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

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """Upload a PNG image and return a public URL"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    filename = save_uploaded_file(file, WALLPAPERS_DIR, f"shared_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}", allowed_extensions={'png', 'jpg', 'jpeg', 'gif', 'pdf'})
    if filename:
        base_url = request.host_url.rstrip('/')
        return jsonify({
            'message': 'Image uploaded successfully',
            'url': f'{base_url}/api/wallpapers/{filename}'
        })
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/export/<int:room_id>')
def export_room(room_id):
    """Export room data as JSON"""
    auth_check = require_auth()
    if auth_check:
        return auth_check
    
    room = get_room_by_id(room_id, session['user_id'])
    room = convert_objectid(room)
    
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

@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    receiver = data.get('receiver')
    if not receiver:
        return jsonify({'error': 'Receiver email required'}), 400
    otp = str(random.randint(100000, 999999))
    expiry = time.time() + 300  # 5 minutes
    otp_store[receiver] = (otp, expiry)
    # Send OTP email
    message = Mail(
        from_email=SENDER_EMAIL,
        to_emails=receiver,
    )
    message.template_id = SENDGRID_TEMPLATE_ID
    message.dynamic_template_data = {
        'otp': otp,
        'pdf_link': '',  # Not used for OTP
    }
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
        return jsonify({'message': 'OTP sent'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify-otp-and-send-pdf', methods=['POST'])
def verify_otp_and_send_pdf():
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    receiver = data.get('receiver')
    otp = data.get('otp')
    pdf_link = data.get('pdf_link')
    if not receiver or not otp or not pdf_link:
        return jsonify({'error': 'Missing data'}), 400
    stored = otp_store.get(receiver)
    if not stored or stored[0] != otp or time.time() > stored[1]:
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    # Send PDF link email
    message = Mail(
        from_email=SENDER_EMAIL,
        to_emails=receiver,
    )
    message.template_id = SENDGRID_TEMPLATE_ID
    message.dynamic_template_data = {
        'otp': '',
        'pdf_link': pdf_link,
    }
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
        del otp_store[receiver]
        return jsonify({'message': 'PDF link sent'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/send-signup-otp', methods=['POST', 'OPTIONS'])
def send_signup_otp():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.json
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON in request'}), 400
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email required'}), 400
    # Check if email is already registered
    if get_user_by_username(email) or get_user_by_id(email):
        return jsonify({'error': 'Email already registered'}), 400
    otp = str(random.randint(100000, 999999))
    expiry = time.time() + 300  # 5 minutes
    save_signup_otp(email, otp, expiry)
    # Send OTP email
    if SENDGRID_API_KEY and SENDGRID_TEMPLATE_ID:
        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=email,
        )
        message.template_id = SENDGRID_TEMPLATE_ID
        message.dynamic_template_data = {
            'otp': otp,
            'pdf_link': '',
        }
        try:
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            sg.send(message)
            return jsonify({'message': 'OTP sent'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        # Fallback: send plain email using Gmail SMTP
        import smtplib
        from email.mime.text import MIMEText
        if not GMAIL_USER or not GMAIL_APP_PASSWORD or not SENDER_EMAIL:
            return jsonify({'error': 'Gmail credentials are not set in environment variables.'}), 500
        try:
            msg = MIMEText(f"Your OTP for signup is: {otp}")
            msg['Subject'] = 'Your Signup OTP'
            msg['From'] = SENDER_EMAIL
            msg['To'] = email
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
                server.sendmail(SENDER_EMAIL, [email], msg.as_string())
            return jsonify({'message': 'OTP sent (plain email)'})
        except Exception as e:
            return jsonify({'error': f'Failed to send OTP email: {str(e)}'}), 500

# Password validation helper
def is_valid_password(password):
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[^A-Za-z0-9]', password):
        return False
    return True

if __name__ == '__main__':
    ensure_directories() # Initialize database on startup
    app.run(host='0.0.0.0', port=5000)
