
import sqlite3
import os
from datetime import datetime
import json

DATABASE_FILE = 'room_designer.db'

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

def init_database():
    """Initialize database with required tables"""
    conn = get_db_connection()
    
    # Create users table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create rooms table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            room_type TEXT NOT NULL,
            dimensions TEXT NOT NULL,
            wall_colors TEXT NOT NULL,
            wallpapers TEXT,
            wall_canvas_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def create_user(username, email, password_hash):
    """Create a new user"""
    conn = get_db_connection()
    try:
        cursor = conn.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        
        # Return the created user
        user = conn.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
        return dict(user) if user else None
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_user_by_username(username):
    """Get user by username"""
    conn = get_db_connection()
    user = conn.execute(
        'SELECT * FROM users WHERE username = ?',
        (username,)
    ).fetchone()
    conn.close()
    return dict(user) if user else None

def get_user_by_id(user_id):
    """Get user by ID"""
    conn = get_db_connection()
    user = conn.execute(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        (user_id,)
    ).fetchone()
    conn.close()
    return dict(user) if user else None

def save_room(user_id, name, room_type, dimensions, wall_colors, wallpapers=None, wall_canvas_data=None):
    """Save a room design"""
    conn = get_db_connection()
    cursor = conn.execute('''
        INSERT INTO rooms (user_id, name, room_type, dimensions, wall_colors, wallpapers, wall_canvas_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        name,
        room_type,
        json.dumps(dimensions),
        json.dumps(wall_colors),
        json.dumps(wallpapers) if wallpapers else None,
        json.dumps(wall_canvas_data) if wall_canvas_data else None
    ))
    room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return room_id

def get_user_rooms(user_id):
    """Get all rooms for a user"""
    conn = get_db_connection()
    rooms = conn.execute(
        'SELECT * FROM rooms WHERE user_id = ? ORDER BY updated_at DESC',
        (user_id,)
    ).fetchall()
    conn.close()
    
    # Convert to list of dictionaries and parse JSON fields
    room_list = []
    for room in rooms:
        room_dict = dict(room)
        room_dict['dimensions'] = json.loads(room_dict['dimensions'])
        room_dict['wall_colors'] = json.loads(room_dict['wall_colors'])
        room_dict['wallpapers'] = json.loads(room_dict['wallpapers']) if room_dict['wallpapers'] else {}
        room_dict['wall_canvas_data'] = json.loads(room_dict['wall_canvas_data']) if room_dict['wall_canvas_data'] else {}
        room_list.append(room_dict)
    
    return room_list

def get_room_by_id(room_id, user_id):
    """Get a specific room by ID and user ID"""
    conn = get_db_connection()
    room = conn.execute(
        'SELECT * FROM rooms WHERE id = ? AND user_id = ?',
        (room_id, user_id)
    ).fetchone()
    conn.close()
    
    if room:
        room_dict = dict(room)
        room_dict['dimensions'] = json.loads(room_dict['dimensions'])
        room_dict['wall_colors'] = json.loads(room_dict['wall_colors'])
        room_dict['wallpapers'] = json.loads(room_dict['wallpapers']) if room_dict['wallpapers'] else {}
        room_dict['wall_canvas_data'] = json.loads(room_dict['wall_canvas_data']) if room_dict['wall_canvas_data'] else {}
        return room_dict
    return None

def update_room(room_id, user_id, **kwargs):
    """Update a room"""
    conn = get_db_connection()
    
    # Build the update query dynamically
    set_clauses = []
    values = []
    
    for key, value in kwargs.items():
        if key in ['dimensions', 'wall_colors', 'wallpapers', 'wall_canvas_data']:
            set_clauses.append(f"{key} = ?")
            values.append(json.dumps(value) if value else None)
        elif key in ['name', 'room_type']:
            set_clauses.append(f"{key} = ?")
            values.append(value)
    
    if set_clauses:
        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
        values.extend([room_id, user_id])
        
        query = f"UPDATE rooms SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?"
        conn.execute(query, values)
        conn.commit()
    
    conn.close()

def delete_room(room_id, user_id):
    """Delete a room"""
    conn = get_db_connection()
    conn.execute(
        'DELETE FROM rooms WHERE id = ? AND user_id = ?',
        (room_id, user_id)
    )
    conn.commit()
    conn.close()
