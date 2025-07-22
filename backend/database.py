import os
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from dotenv import load_dotenv  # Add missing import
from werkzeug.security import generate_password_hash
load_dotenv()
# MongoDB connection setup 
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DBNAME = os.getenv("MONGODB_DBNAME")
print(MONGODB_URI)
print(MONGODB_DBNAME)

client = MongoClient(MONGODB_URI)
if not MONGODB_DBNAME:
    raise ValueError("MONGODB_DBNAME must be a non-empty string")
db = client[MONGODB_DBNAME]

print(f"✅ Connected to DB: {db.name}")

# USERS

def create_user(username, password, email):
    user = {
        "username": username,
        "email": email,
        "password_hash": generate_password_hash(password),
        "created_at": datetime.now()
    }
    try:
        result = db.users.insert_one(user)
        user["id"] = str(result.inserted_id)
        del user["password_hash"]  # Don't return the hash
        return user
    except Exception as e:
        print("❌ Error creating user:", e)
        return None


def get_user_by_username(username):
    user = db.users.find_one({"username": username})
    if user:
        user["id"] = str(user["_id"])
        return user
    return None

def get_user_by_id(user_id):
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
            del user["password_hash"]
            return user
    except Exception:
        pass
    return None

# ROOMS

def save_room(user_id, name, room_type, dimensions, wall_colors, wallpapers=None, wall_canvas_data=None, walls=None):
    room = {
        "user_id": user_id,
        "name": name,
        "room_type": room_type,
        "dimensions": dimensions,
        "wall_colors": wall_colors,
        "wallpapers": wallpapers or {},
        "wall_canvas_data": wall_canvas_data or {},
        "walls": walls or {},
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    result = db.rooms.insert_one(room)
    return str(result.inserted_id)

def get_user_rooms(user_id):
    rooms = db.rooms.find({"user_id": user_id}).sort("updated_at", -1)
    room_list = []
    for room in rooms:
        room["id"] = str(room["_id"])
        room_list.append(room)
    return room_list

def get_room_by_id(room_id, user_id):
    try:
        room = db.rooms.find_one({"_id": ObjectId(room_id), "user_id": user_id})
        if room:
            room["id"] = str(room["_id"])
            return room
    except Exception:
        pass
    return None

def update_room(room_id, user_id, **kwargs):
    update_fields = kwargs.copy()
    update_fields["updated_at"] = datetime.utcnow()
    db.rooms.update_one(
        {"_id": ObjectId(room_id), "user_id": user_id},
        {"$set": update_fields}
    )

def delete_room(room_id, user_id):
    db.rooms.delete_one({"_id": ObjectId(room_id), "user_id": user_id})

def save_signup_otp(email, otp, expiry):
    db.signup_otps.update_one(
        {"email": email},
        {"$set": {"otp": otp, "expiry": expiry, "created_at": datetime.now()}},
        upsert=True
    )

def get_signup_otp(email):
    return db.signup_otps.find_one({"email": email})

def delete_signup_otp(email):
    db.signup_otps.delete_one({"email": email})
