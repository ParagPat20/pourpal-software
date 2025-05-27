import os
import json
import socket
import threading
import firebase_admin
from firebase_admin import credentials, storage
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import base64

# Initialize Firebase Admin SDK with encoded credentials
def get_decoded_credentials():
    try:
        # Read the encoded credentials file
        with open("encoded_credentials.txt", 'r') as f:
            encoded_data = f.read()
        
        # Decode the credentials
        decoded_data = base64.b64decode(encoded_data).decode()
        credentials_dict = json.loads(decoded_data)
        
        # Create credentials object
        return credentials.Certificate(credentials_dict)
    except Exception as e:
        print(f"Error loading credentials: {str(e)}")
        return None

# Initialize Firebase with decoded credentials
cred = get_decoded_credentials()
if cred:
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'jecon-cocktail-machine.firebasestorage.app'
    })
else:
    raise Exception("Failed to initialize Firebase credentials")

# Get a reference to the storage service
bucket = storage.bucket()

# Define local paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
OFFLINE_FLAG_FILE = os.path.join(STATIC_DIR, "offline.txt")
LOCAL_IMG_DIR = os.path.join(STATIC_DIR, "img")
LOCAL_UPLOAD_DIR = os.path.join(LOCAL_IMG_DIR, "upload")

# Ensure static directory exists
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(LOCAL_IMG_DIR, exist_ok=True)
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

# Create a thread pool for concurrent operations
thread_pool = ThreadPoolExecutor(max_workers=4)

def check_internet_connection(host="8.8.8.8", port=53, timeout=3):
    """
    Check internet connectivity by attempting to connect to a reliable host.
    Returns True if connection is successful, False otherwise.
    """
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error:
        return False

def is_online():
    """Check if the app is online by first checking internet connectivity."""
    # First check basic internet connectivity
    if not check_internet_connection():
        return False
        
    # If internet is available, check Firebase Storage
    try:
        # Try to list files in the root directory
        bucket.list_blobs(prefix="data/", max_results=1)
        return True
    except Exception:
        return False

def handle_offline_state():
    """Handle offline state by creating offline flag and ensuring local files exist."""
    # Create offline flag
    Path(OFFLINE_FLAG_FILE).touch()
    print("App is offline, changes will be synced when online")
    
    # Ensure local files exist
    initialize_files()

def handle_online_state():
    """Handle online state by checking offline flag and syncing if needed."""
    if os.path.exists(OFFLINE_FLAG_FILE):
        # We were offline before, upload local changes
        data_files = {
            "data/db.json": os.path.join(STATIC_DIR, "db.json"),
            "data/products.json": os.path.join(STATIC_DIR, "products.json"),
            "data/config.json": os.path.join(STATIC_DIR, "config.json")
        }
        
        # Submit all upload tasks to thread pool
        futures = []
        for remote_path, local_path in data_files.items():
            if os.path.exists(local_path):
                print(f"Starting upload of {local_path}")
                future = thread_pool.submit(upload_file_thread, local_path, remote_path)
                futures.append(future)
        
        # Submit image upload tasks
        local_images = get_local_images()
        firebase_images = get_firebase_images()
        for img_path in local_images:
            if img_path not in firebase_images:
                local_path = os.path.join(STATIC_DIR, img_path)
                if os.path.exists(local_path):
                    print(f"Starting upload of new image: {img_path}")
                    future = thread_pool.submit(upload_file_thread, local_path, img_path)
                    futures.append(future)
        
        # Wait for all uploads to complete
        success = True
        for future in futures:
            if not future.result():
                success = False
        
        # Remove offline flag
        os.remove(OFFLINE_FLAG_FILE)
        print("App is back online, changes have been synced")
    else:
        # Just download latest files using threads
        download_all_data()
        download_new_images()

def download_file_thread(remote_path, local_path):
    """Thread function for downloading a file."""
    try:
        blob = bucket.blob(remote_path)
        # Ensure directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        blob.download_to_filename(local_path)
        return True
    except Exception as e:
        print(f"Error downloading {remote_path}: {str(e)}")
        return False

def upload_file_thread(local_path, remote_path):
    """Thread function for uploading a file."""
    try:
        blob = bucket.blob(remote_path)
        blob.upload_from_filename(local_path)
        return True
    except Exception as e:
        print(f"Error uploading {local_path}: {str(e)}")
        return False

def initialize_files():
    """Initialize required files if they don't exist."""
    data_files = {
        "data/db.json": os.path.join(STATIC_DIR, "db.json"),
        "data/products.json": os.path.join(STATIC_DIR, "products.json"),
        "data/config.json": os.path.join(STATIC_DIR, "config.json")
    }

    # Create empty files if they don't exist
    for local_path in data_files.values():
        if not os.path.exists(local_path):
            with open(local_path, 'w') as f:
                json.dump([], f)

def sync_data():
    """Sync data between Firebase Storage and local storage."""
    # Check internet connectivity first
    if not check_internet_connection():
        handle_offline_state()
        return

    # Initialize files first
    initialize_files()

    if is_online():
        handle_online_state()
    else:
        handle_offline_state()

def get_firebase_images():
    """Get list of all images in Firebase Storage."""
    try:
        # Get all blobs in the img directory
        blobs = bucket.list_blobs(prefix="img/")
        return [blob.name for blob in blobs]
    except Exception as e:
        print(f"Error getting Firebase images: {str(e)}")
        return []

def get_local_images():
    """Get list of all images in local storage."""
    local_images = []
    
    # Get images from img directory
    if os.path.exists(LOCAL_IMG_DIR):
        for root, _, files in os.walk(LOCAL_IMG_DIR):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    # Convert local path to Firebase path format
                    rel_path = os.path.relpath(os.path.join(root, file), STATIC_DIR)
                    local_images.append(rel_path.replace('\\', '/'))
    
    return local_images

def sync_images():
    """Sync images between Firebase Storage and local storage using threads."""
    if not is_online():
        print("Cannot sync images: App is offline")
        return False

    try:
        # Get lists of images
        firebase_images = get_firebase_images()
        local_images = get_local_images()

        # Create necessary directories if they don't exist
        os.makedirs(LOCAL_IMG_DIR, exist_ok=True)
        os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

        # Submit download tasks for new images
        download_futures = []
        for img_path in firebase_images:
            local_path = os.path.join(STATIC_DIR, img_path)
            if img_path not in local_images and not os.path.exists(local_path):
                print(f"Starting download of new image: {img_path}")
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                future = thread_pool.submit(download_file_thread, img_path, local_path)
                download_futures.append(future)

        # Submit upload tasks for new images
        upload_futures = []
        for img_path in local_images:
            if img_path not in firebase_images:
                local_path = os.path.join(STATIC_DIR, img_path)
                if os.path.exists(local_path):
                    print(f"Starting upload of new image: {img_path}")
                    future = thread_pool.submit(upload_file_thread, local_path, img_path)
                    upload_futures.append(future)

        # Wait for all operations to complete
        success = True
        for future in download_futures + upload_futures:
            if not future.result():
                success = False

        return success
    except Exception as e:
        print(f"Error syncing images: {str(e)}")
        return False

def upload_all_data():
    """Upload all data files to Firebase Storage using threads."""
    if not is_online():
        print("Cannot upload: App is offline")
        return False

    data_files = {
        "data/db.json": os.path.join(STATIC_DIR, "db.json"),
        "data/products.json": os.path.join(STATIC_DIR, "products.json"),
        "data/config.json": os.path.join(STATIC_DIR, "config.json")
    }

    # Submit all upload tasks to thread pool
    futures = []
    for remote_path, local_path in data_files.items():
        if os.path.exists(local_path):
            print(f"Starting upload of {local_path}")
            future = thread_pool.submit(upload_file_thread, local_path, remote_path)
            futures.append(future)

    # Wait for all uploads to complete
    success = True
    for future in futures:
        if not future.result():
            success = False

    return success

def download_all_data():
    """Download all data files from Firebase Storage using threads."""
    if not is_online():
        print("Cannot download: App is offline")
        return False

    data_files = {
        "data/db.json": os.path.join(STATIC_DIR, "db.json"),
        "data/products.json": os.path.join(STATIC_DIR, "products.json"),
        "data/config.json": os.path.join(STATIC_DIR, "config.json")
    }

    # Submit all download tasks to thread pool
    futures = []
    for remote_path, local_path in data_files.items():
        print(f"Starting download of {remote_path}")
        future = thread_pool.submit(download_file_thread, remote_path, local_path)
        futures.append(future)

    # Wait for all downloads to complete
    success = True
    for future in futures:
        if not future.result():
            success = False

    return success

def upload_new_images():
    """Upload only new images that exist locally but not in Firebase."""
    if not is_online():
        print("Cannot upload images: App is offline")
        return False

    try:
        firebase_images = get_firebase_images()
        local_images = get_local_images()
        
        success = True
        for img_path in local_images:
            if img_path not in firebase_images:
                local_path = os.path.join(STATIC_DIR, img_path)
                if os.path.exists(local_path):
                    print(f"Uploading new image: {img_path}")
                    if not upload_file_thread(local_path, img_path):
                        success = False
        
        return success
    except Exception as e:
        print(f"Error uploading new images: {str(e)}")
        return False

def download_new_images():
    """Download only new images that exist in Firebase but not locally."""
    if not is_online():
        print("Cannot download images: App is offline")
        return False

    try:
        firebase_images = get_firebase_images()
        local_images = get_local_images()
        
        success = True
        for img_path in firebase_images:
            if img_path not in local_images:
                local_path = os.path.join(STATIC_DIR, img_path)
                if not os.path.exists(local_path):
                    print(f"Downloading new image: {img_path}")
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    if not download_file_thread(img_path, local_path):
                        success = False
        
        return success
    except Exception as e:
        print(f"Error downloading new images: {str(e)}")
        return False 