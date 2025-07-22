
import os
from werkzeug.utils import secure_filename

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def save_uploaded_file(file, upload_folder, prefix='', allowed_extensions={'png', 'jpg', 'jpeg', 'gif'}):
    if file and allowed_file(file.filename, allowed_extensions):
        filename = secure_filename(file.filename)
        if prefix:
            filename = f"{prefix}_{filename}"
        
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        return filename
    return None

def validate_room_data(data):
    """Validate room data structure"""
    required_fields = ['roomType', 'dimensions']
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate dimensions
    dimensions = data['dimensions']
    required_dims = ['length', 'width', 'height']
    for dim in required_dims:
        if dim not in dimensions:
            return False, f"Missing dimension: {dim}"
        if not isinstance(dimensions[dim], (int, float)) or dimensions[dim] <= 0:
            return False, f"Invalid dimension value for {dim}"
    
    return True, "Valid"
