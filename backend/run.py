from app import create_app
import logging
import os

app = create_app()

# Use environment-driven logging to avoid DEBUG overhead in production.
log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
log_level = getattr(logging, log_level_name, logging.INFO)
logging.basicConfig(level=log_level)
app.logger.setLevel(log_level)

if __name__ == "__main__":
	# Disable reloader and debug mode to avoid module caching issues
	app.run(host="0.0.0.0", port=3001, use_reloader=False, debug=False)

