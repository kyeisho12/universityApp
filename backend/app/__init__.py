from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os


def create_app():
	# Ensure environment variables from .env are loaded before any config/service imports
	load_dotenv()

	app = Flask(__name__)

	# Load config
	env = os.getenv("FLASK_ENV", "development")
	app.config.from_object(f"app.config.settings.Config_{env.capitalize()}")

	# Enable CORS
	CORS(app)

	# Register blueprints
	from app.api import api_bp
	app.register_blueprint(api_bp, url_prefix="/api")

	return app

