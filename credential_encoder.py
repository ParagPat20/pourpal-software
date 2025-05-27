import base64
import json
import os

def encode_credentials(input_file, output_file):
    """
    Encode the Firebase credentials file using base64 encoding.
    """
    try:
        # Read the original credentials file
        with open(input_file, 'r') as f:
            credentials = json.load(f)
        
        # Convert to string and encode
        credentials_str = json.dumps(credentials)
        encoded_credentials = base64.b64encode(credentials_str.encode()).decode()
        
        # Write encoded credentials to output file
        with open(output_file, 'w') as f:
            f.write(encoded_credentials)
            
        print(f"Credentials successfully encoded to {output_file}")
        return True
    except Exception as e:
        print(f"Error encoding credentials: {str(e)}")
        return False

def decode_credentials(encoded_file, output_file):
    """
    Decode the encoded credentials file and save as JSON.
    """
    try:
        # Read the encoded file
        with open(encoded_file, 'r') as f:
            encoded_data = f.read()
        
        # Decode and convert back to JSON
        decoded_data = base64.b64decode(encoded_data).decode()
        credentials = json.loads(decoded_data)
        
        # Write decoded credentials to output file
        with open(output_file, 'w') as f:
            json.dump(credentials, f, indent=2)
            
        print(f"Credentials successfully decoded to {output_file}")
        return True
    except Exception as e:
        print(f"Error decoding credentials: {str(e)}")
        return False

if __name__ == "__main__":
    # Example usage
    input_file = "jecon-cocktail-machine-firebase-adminsdk-fbsvc-45a8e9fa22.json"
    encoded_file = "encoded_credentials.txt"
    decoded_file = "decoded_credentials.json"
    
    # Encode the credentials
    encode_credentials(input_file, encoded_file)
    
    # Decode the credentials
    decode_credentials(encoded_file, decoded_file) 