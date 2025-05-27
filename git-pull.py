import os
import subprocess

# Path to your local repository
repo_dir = "C:/Users/karan/Desktop/NEW_APP"

# Change directory to the repository
os.chdir(repo_dir)


# Step 1: Pull the latest changes from the remote repository
def git_pull():
    try:
        subprocess.run(["git", "pull"], check=True)
        print("Successfully pulled the latest changes.")
    except subprocess.CalledProcessError as e:
        print(f"Error pulling changes: {e}")


# Main function to execute the pull step
def pull_latest_changes():
    git_pull()


# Call the function to pull the latest changes
pull_latest_changes()
