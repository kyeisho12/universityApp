from app import create_app
import logging

app = create_app()

# Enable detailed error logging
logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)

if __name__ == "__main__":
	# Disable reloader and debug mode to avoid module caching issues
	app.run(host="0.0.0.0", port=3001, use_reloader=False, debug=False)

