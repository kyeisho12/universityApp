import os
import subprocess

port = os.environ.get("PORT", "8000")
print(f"PORT is {port}")

subprocess.run([
    "gunicorn",
    f"--bind=0.0.0.0:{port}",
    "run:app"
])
