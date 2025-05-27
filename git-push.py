import os
import subprocess

# Path to your local repository
repo_dir = "C:/Users/karan/Desktop/NEW_APP"


# Change directory to the repository
os.chdir(repo_dir)


# Step 1: Update the remote URL to the correct GitHub repository
def update_remote_url():
    try:
        subprocess.run(
            [
                "git",
                "remote",
                "set-url",
                "origin",
                "https://github.com/ParagPat20/pourpal-software.git",
            ],
            check=True,
        )
        print("Successfully updated the remote URL.")
    except subprocess.CalledProcessError as e:
        print(f"Error updating remote URL: {e}")


# Step 2: Pull the latest changes from the remote repository
def git_pull():
    try:
        subprocess.run(["git", "pull"], check=True)
        print("Successfully pulled the latest changes.")
    except subprocess.CalledProcessError as e:
        print(f"Error pulling changes: {e}")


# Step 3: Add changes to the staging area (you can specify files or use '.' for all)
def git_add():
    try:
        subprocess.run(["git", "add", "."], check=True)  # Adds all changes
        print("Successfully added changes.")
    except subprocess.CalledProcessError as e:
        print(f"Error adding changes: {e}")


# Step 4: Commit the changes with a commit message
def git_commit(message):
    try:
        subprocess.run(["git", "commit", "-m", message], check=True)
        print("Successfully committed changes.")
    except subprocess.CalledProcessError as e:
        print(f"Error committing changes: {e}")


# Step 5: Push the changes to the remote repository
def git_push():
    try:
        # Check the current remote URL to ensure it's correct
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"], capture_output=True, text=True
        )
        remote_url = result.stdout.strip()
        print(f"Remote URL: {remote_url}")

        # If using HTTPS, prompt for credentials (personal access token instead of password)
        if remote_url.startswith("https://"):
            print(
                "Using HTTPS for pushing. If prompted, use your GitHub personal access token."
            )

        # Run the push command and capture both stdout and stderr
        result = subprocess.run(
            ["git", "push"], check=True, capture_output=True, text=True
        )
        print(result.stdout)  # Output of the git push command
        print("Successfully pushed changes to remote repository.")
    except subprocess.CalledProcessError as e:
        # Capture stderr if present
        error_message = e.stderr if e.stderr else e.output
        print(f"Error pushing changes: {error_message}")

        # Handle permission denied error
        if error_message and "permission denied" in error_message.lower():
            print(
                "Permission denied. Please check your access rights or authentication method."
            )


# Main function to execute all steps
def update_git_repo(commit_message):
    update_remote_url()  # Ensure the correct remote URL is set
    git_pull()
    git_add()
    git_commit(commit_message)
    git_push()


# Example commit message
commit_message = "New Css Fixes"

# Call the update function with a commit message
update_git_repo(commit_message)
