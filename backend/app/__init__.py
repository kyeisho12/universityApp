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

	# Enable CORS with explicit API settings for Authorization + multipart preflight.
	configured_origins = app.config.get("CORS_ORIGINS", "*")
	if isinstance(configured_origins, str) and configured_origins != "*":
		configured_origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]

	default_origins = [
		"http://localhost:3000",
		"http://localhost:5173",
		"https://university-app-pink.vercel.app",
		"https://*.vercel.app",
	]

	origins = configured_origins if configured_origins and configured_origins != "*" else default_origins

	CORS(
		app,
		resources={
			r"/api/*": {
				"origins": origins,
				"methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
				"allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
				"expose_headers": ["Content-Type", "Authorization"],
			}
		},
		supports_credentials=False,
	)

	# Register blueprints
	from app.api import api_bp
	app.register_blueprint(api_bp, url_prefix="/api")

	return app

