import os

# 1. Focus on React and CSS files
INCLUDE_EXTENSIONS = ('.jsx', '.js', '.css', '.html')
# 2. Start looking specifically inside the frontend source
START_DIR = './frontend/src'
IGNORE_DIRS = {'node_modules', '.git', '__pycache__'}

def generate_frontend_bundle():
    # Name it differently so it doesn't overwrite your full backend snapshot
    output_file = 'frontend_snapshot.txt'
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Check if directory exists before walking
        if not os.path.exists(START_DIR):
            print(f"❌ Error: {START_DIR} not found. Make sure you're in the project root.")
            return

        for root, dirs, files in os.walk(START_DIR):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file.endswith(INCLUDE_EXTENSIONS):
                    file_path = os.path.join(root, file)
                    outfile.write(f"\n{'='*50}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*50}\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            outfile.write(f.read())
                    except Exception as e:
                        outfile.write(f"Error reading file: {e}")
                        
    print(f"✅ {output_file} created! This contains only your React UI code.")

if __name__ == "__main__":
    generate_frontend_bundle()