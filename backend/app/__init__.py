from flask import Flask
from flask_cors import CORS
import os


def create_app():
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

