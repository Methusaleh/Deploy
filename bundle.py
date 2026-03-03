import os

# Files to include in the snapshot
INCLUDE_EXTENSIONS = ('.py', '.sql', '.txt')
IGNORE_DIRS = {'.venv', '__pycache__', '.git', 'node_modules'}

def generate_bundle():
    with open('deploy_snapshot.txt', 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk('.'):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file.endswith(INCLUDE_EXTENSIONS) and file != 'deploy_snapshot.txt':
                    file_path = os.path.join(root, file)
                    outfile.write(f"\n{'='*50}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*50}\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            outfile.write(f.read())
                    except Exception as e:
                        outfile.write(f"Error reading file: {e}")
    print("✅ deploy_snapshot.txt created! Drag and drop it into the chat.")

if __name__ == "__main__":
    generate_bundle()