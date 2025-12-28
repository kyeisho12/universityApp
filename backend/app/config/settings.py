import os


class BaseConfig:
	SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
	DEBUG = False
	TESTING = False
	CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")


class Config_Development(BaseConfig):
	DEBUG = True


class Config_Production(BaseConfig):
	DEBUG = False


class Config_Testing(BaseConfig):
	TESTING = True
	DEBUG = True

