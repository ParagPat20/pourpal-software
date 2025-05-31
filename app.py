import json
import logging
import os
import platform
import subprocess
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import serial
import serial.tools.list_ports
from image_handler import processing_complete
# from firebase_storage import sync_data, upload_all_data, download_all_data, sync_images

# Define the base directory as the directory where this script is located
base_dir = os.path.dirname(__file__)
web_dir = os.path.join(base_dir, "static")  # Define `static` folder path


class CustomHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # If the requested path is '/home', serve `index.html` from the `static` folder
        if path == "/home":
            return os.path.join(web_dir, "index.html")

        # For all other paths, serve files from `web_dir` (static folder)
        return os.path.join(web_dir, path.lstrip("/"))

    def send_no_cache_headers(self):
        self.send_header(
            "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
        )
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")

    def do_GET(self):
        if self.path == "processing_complete":
            try:
                # Check if processing is complete by checking the event
                if processing_complete.is_set():
                    self.send_response(200)
                    self.send_no_cache_headers()
                    self.end_headers()
                else:
                    self.send_response(404)
                    self.send_no_cache_headers()
                    self.end_headers()
            except Exception as e:
                self.send_response(500)
                self.send_no_cache_headers()
                self.end_headers()
                self.wfile.write(str(e).encode())
            return

        if self.path == "/check-completion":
            try:
                # Check if processing is complete by checking the event
                if processing_complete.is_set():
                    self.send_response(200)
                    self.send_no_cache_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "completed"}).encode())
                else:
                    self.send_response(200)
                    self.send_no_cache_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "processing"}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_no_cache_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        # For db.json and image requests, prevent caching
        if (
            self.path.endswith(".json")
            or self.path.endswith(".png")
            or self.path.endswith(".jpg")
        ):
            self.send_response(200)
            self.send_no_cache_headers()
            with open(self.translate_path(self.path), "rb") as f:
                content = f.read()
            self.end_headers()
            self.wfile.write(content)
            return
            
        # Check for updates endpoint
        elif self.path == "/check-updates":
            try:
                # Run git fetch to check for updates
                result = subprocess.run(
                    ["git", "fetch", "origin"],
                    cwd=base_dir,
                    capture_output=True,
                    text=True
                )
                
                # Check if there are updates available
                result = subprocess.run(
                    ["git", "rev-list", "HEAD...origin/main", "--count"],
                    cwd=base_dir,
                    capture_output=True,
                    text=True
                )
                
                commit_count = int(result.stdout.strip())
                
                if commit_count > 0:
                    # Get the latest commit message
                    result = subprocess.run(
                    ["git", "log", "-1", "origin/main", "--pretty=format:%s"],
                    cwd=base_dir,
                    capture_output=True,
                    text=True
                    )
                    
                    commit_message = result.stdout.strip()
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                    "hasUpdates": True,
                    "message": f"New updates available ({commit_count} commits). Latest: {commit_message}"
                    }).encode())
                else:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                    "hasUpdates": False,
                    "message": "No updates available"
                    }).encode())
            except Exception as e:
                print(f"Error checking for updates: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": str(e)
                }).encode())
            return

        # Use default GET behavior with the updated `translate_path` for other paths
        super().do_GET()

    def do_POST(self):
        if self.path == "/delete_processing_flag":
            try:
                processing_complete.clear()
                self.send_response(200)
                self.end_headers()
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
            return

        elif self.path == "/cancel-drink":
            try:
                # Find the appropriate serial port
                port = None
                available_ports = serial.tools.list_ports.comports()
                
                for p in available_ports:
                    if p.device == "/dev/ttyACM0" or p.device == "/dev/ttyUSB0":
                        port = p.device
                        break

                if port is None:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(b"Error: No suitable serial port found")
                    return

                try:
                    with serial.Serial(port, 9600, timeout=5) as ser:
                        # Send cancel command to Arduino
                        ser.write(b"CANCEL\n")
                        
                        # Clear the processing complete flag
                        processing_complete.clear()
                        
                        self.send_response(200)
                        self.end_headers()
                        self.wfile.write(b"Drink cancelled successfully")
                except serial.SerialException as e:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(f"Serial error: {str(e)}".encode())
                    
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
            return

        elif self.path == "/shutdown":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Server shutting down...")
            print("Shutting down the server...")
            
            # Kill the watchdog process if it exists
            if platform.system() == "Windows":
                subprocess.run(["taskkill", "/F", "/IM", "watchdog.exe"], capture_output=True)
                # Kill the Python process itself
                subprocess.run(["taskkill", "/F", "/IM", "python.exe"], capture_output=True)
            else:
                subprocess.run(["pkill", "-f", "watchdog"], capture_output=True)
                # Kill the Python process itself
                subprocess.run(["pkill", "-f", "python3"], capture_output=True)
            
            # Force exit all processes
            os._exit(0)
            return
            
        elif self.path == "/pull-updates":
            try:
                # Reset git and pull latest changes
                subprocess.run(["git", "reset", "--hard"], cwd=base_dir, check=True)
                subprocess.run(["git", "pull", "origin", "main"], cwd=base_dir, check=True)
                
                # Send success response
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "Update successful"
                }).encode())
                
                # Restart the application
                threading.Thread(target=self.restart_application).start()
                
            except Exception as e:
                print(f"Error pulling updates: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": str(e)
                }).encode())
            return

        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)

        # Handling focus-in and focus-out events
        if self.path == "/focus-in":
            if platform.system() != "Windows":
                threading.Thread(
                    target=self.execute_shell_script, args=("keyboardstart.sh",)
                ).start()
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"Focus-in event received, running keyboardstart.sh")
            else:
                self.send_response(200)
                self.end_headers()
                self.wfile.write(
                    b"Focus-in event received, but keyboard functionality is disabled on Windows."
                )

        elif self.path == "/focus-out":
            if platform.system() != "Windows":
                threading.Thread(
                    target=self.execute_shell_script, args=("keyboardstop.sh",)
                ).start()
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"Focus-out event received, running keyboardstop.sh")
            else:
                self.send_response(200)
                self.end_headers()
                self.wfile.write(
                    b"Focus-out event received, but keyboard functionality is disabled on Windows."
                )

        elif self.path == "/addIngredient":
            self.add_ingredient(post_data)
            # upload_all_data()
            # sync_images()

        elif self.path == "/addCocktail":
            self.add_cocktail(post_data)
            # upload_all_data()
            # sync_images()

        elif self.path == "/send-pipes":
            self.handle_send_pipes(post_data)
            # upload_all_data()
            # sync_images()
            return
        
        elif self.path == "/save-config":
            self.save_config(post_data)
            # upload_all_data()
            # sync_images()

        elif self.path == "/updateIngredients":
            self.update_ingredients(post_data)
            # upload_all_data()
            # sync_images()

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def execute_shell_script(self, script_name):
        # Run scripts from the same directory as the Python script
        script_path = os.path.join(base_dir, script_name)
        if platform.system() == "Windows":
            subprocess.Popen(["cmd", "/c", script_path])
        elif platform.system() == "Linux":
            subprocess.Popen(["sh", script_path])
        else:
            print(f"Unsupported operating system for script execution.")
    def save_config(self, post_data):
        try:
            config_data = json.loads(post_data)
            config_path = os.path.join(web_dir, "config.json")
            
            # Load existing config if it exists
            existing_config = {}
            if os.path.exists(config_path):
                with open(config_path, "r") as file:
                    existing_config = json.load(file)
            
            # Merge new config with existing config
            merged_config = {**existing_config, **config_data}
            
            # Write the merged configuration data to config.json
            with open(config_path, "w") as file:
                json.dump(merged_config, file, indent=2)

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Config saved successfully")
        except Exception as e:
            print(f"Error saving config: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Error saving config")
            
    def add_cocktail(self, post_data):
        try:
            new_cocktail = json.loads(post_data)
            
            # Validate required fields
            required_fields = ["PID", "PNID", "PName", "PImage", "PCat", "PDesc", "PHtm", "PIng"]
            for field in required_fields:
                if field not in new_cocktail:
                    return f"Missing required field: {field}", 400

            # Validate ingredient measurements
            for ingredient in new_cocktail["PIng"]:
                if "ING_ML" not in ingredient:
                    ingredient["ING_ML"] = "0"  # Default to 0 if not specified

            # Read existing cocktails
            products_path = os.path.join(web_dir, "products.json")
            if not os.path.exists(products_path):
                print(f"products.json not found at {products_path}")
                return "Error: products.json file not found", 500

            with open(products_path, "r") as f:
                cocktails = json.load(f)

            # Check if PID already exists
            if any(cocktail["PID"] == new_cocktail["PID"] for cocktail in cocktails):
                return "Cocktail ID already exists", 400

            # Add the new cocktail
            cocktails.append(new_cocktail)

            # Save updated cocktails
            with open(products_path, "w") as f:
                json.dump(cocktails, f, indent=2)

            return "Cocktail added successfully", 200
        except Exception as e:
            print(f"Error adding cocktail: {e}")
            return str(e), 500

    def add_ingredient(self, post_data):
        try:
            # Reset the completion event before starting
            print("Processing new ingredient request")

            # Validate post data
            try:
                new_ingredient = json.loads(post_data)
                print(f"Received ingredient data: {new_ingredient}")
            except json.JSONDecodeError as je:
                print(f"Invalid POST data format: {str(je)}")
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Invalid ingredient data format")
                return

            # Load existing ingredients from db.json
            db_path = os.path.join(web_dir, "db.json")
            if not os.path.exists(db_path):
                print(f"db.json not found at {db_path}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Error: db.json file not found")
                return

            with open(db_path, "r") as file:
                file_content = file.read()
                if not file_content:
                    data = []
                else:
                    data = json.loads(file_content)

            # Parse the new ingredient data
            new_ingredient = json.loads(post_data)

            # Append the new ingredient to the existing data
            if not isinstance(data, list):
                data = []
            data.append(new_ingredient)

            # Write the updated data back to db.json
            with open(os.path.join(web_dir, "db.json"), "w") as file:
                json.dump(data, file, indent=2)

                # Wait for image processing to complete (with timeout)
                self.send_response(201)
                self.end_headers()
                self.wfile.write(b"Ingredient added successfully")

        except Exception as e:
            print(f"Error adding ingredient: {e}")  # Log the error to the console
            self.send_response(500)  # Internal Server Error
            self.end_headers()
            self.wfile.write(f"Error saving ingredient: {str(e)}".encode())

    def handle_send_pipes(self, post_data):
        try:
            data = json.loads(post_data)
            
            # Find the correct serial port
            port = None
            if platform.system() == "Windows":
                # On Windows, look for COM ports
                for i in range(10):  # Check COM0 through COM9
                    try:
                        test_port = f"COM{i}"
                        with serial.Serial(test_port, 9600, timeout=1) as ser:
                            port = test_port
                            break
                    except serial.SerialException:
                        continue
            else:
                # On Linux, use ttyUSB0
                port = "/dev/ttyUSB0"

            if port is None:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Error: No suitable serial port found")
                return

            try:
                with serial.Serial(port, 9600, timeout=5) as ser:
                    # Send the entire data as JSON
                    ser.write(json.dumps(data).encode() + b"\n")
                    
                    # Wait for and read the response
                    response = ser.readline().decode().strip()
                    print(f"Arduino response: {response}")
                    
                    if response == "OK":
                        # Wait for the COMPLETED response
                        while True:
                            response = ser.readline().decode().strip()
                            print(f"Arduino status: {response}")
                            if response == "COMPLETED":
                                self.send_response(200)
                                self.end_headers()
                                self.wfile.write(json.dumps({"status": "completed"}).encode())
                                break
                            elif response == "ERROR":
                                raise Exception("Arduino reported an error")
                    else:
                        raise Exception(f"Unexpected response from Arduino: {response}")
                
            except serial.SerialException as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f"Serial error: {str(e)}".encode())
                
        except Exception as e:
            print(f"Error in handle_send_pipes: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error: {str(e)}".encode())

    def update_ingredients(self, post_data):
        try:
            # Parse the updated ingredients data
            updated_ingredients = json.loads(post_data)
            
            # Write the updated data back to db.json
            with open(os.path.join(web_dir, "db.json"), "w") as file:
                json.dump(updated_ingredients, file, indent=2)
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Ingredients updated successfully")
        except Exception as e:
            print(f"Error updating ingredients: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error updating ingredients: {str(e)}".encode())

    def restart_application(self):
        """Restart the application after a short delay."""
        time.sleep(2)  # Give time for the response to be sent
        
        # Kill the current process
        if platform.system() == "Windows":
            subprocess.run(["taskkill", "/F", "/IM", "python.exe"], capture_output=True)
        else:
            subprocess.run(["pkill", "-f", "python3"], capture_output=True)
        
        # Start a new instance of the application
        if platform.system() == "Windows":
            subprocess.Popen(["python", os.path.join(base_dir, "app.py")])
        else:
            subprocess.Popen(["python3", os.path.join(base_dir, "app.py")])
        
        # Exit the current process
        os._exit(0)


def start_http_server():
    global httpd
    httpd = HTTPServer(("127.0.0.1", 5000), CustomHandler)
    print("HTTP server running on http://127.0.0.1:5000")
    httpd.serve_forever()


def start_electron_app():
    time.sleep(2)
    os.environ["DISPLAY"] = ":0"

    electron_executable = None

    if platform.system() == "Windows":
        # Define the base path to check for "karan" or "Parag Patil"
        users_base_path = r"C:/Users/"

        # Initialize user_identifier
        user_identifier = None

        # Check for "karan" or "Parag Patil" in the C:\Users\ directory
        if os.path.exists(os.path.join(users_base_path, "karan")):
            user_identifier = "karan"
        elif os.path.exists(os.path.join(users_base_path, "Parag Patil")):
            user_identifier = "Parag Patil"

        if user_identifier is None:
            print("Neither 'karan' nor 'Parag Patil' directories found in C:\\Users\\")
            return  # Exit if neither directory is found

        print(f"User Identifier: {user_identifier}")
        electron_executable = os.path.join(users_base_path, user_identifier, r"AppData/Roaming/npm/node_modules/electron/dist/electron.exe")

    elif platform.system() == "Linux":
        electron_executable = "/usr/local/bin/electron"
    else:
        raise EnvironmentError("Unsupported operating system")

    # Disable caching by adding the --no-cache flag to the Electron process
    electron_process = subprocess.Popen(
        [
            electron_executable,
            os.path.join(web_dir, "main.js"),
        ]
    )
    electron_process.communicate()

def start_image_handler():
    """Start the image handler script in a separate thread."""
    subprocess.Popen(["python3", os.path.join(base_dir, "image_handler.py")])


if __name__ == "__main__":
    # Sync data with Firebase Storage at startup
    # sync_data()
    # # Sync images with Firebase Storage at startup
    # sync_images()
    
    # Start the HTTP server in a separate thread
    http_thread = threading.Thread(target=start_http_server)
    http_thread.start()

    start_image_handler()

    # Start the Electron app after a slight delay to ensure the server is up
    start_electron_app()
