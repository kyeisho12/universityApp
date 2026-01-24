from app import create_app
import logging

app = create_app()

# Enable detailed error logging
logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)

if __name__ == "__main__":
	# Disable the reloader so the process stays in the foreground (easier to see errors)
	app.run(host="0.0.0.0", port=5000, use_reloader=False, debug=True)

