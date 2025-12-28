from app import create_app


def test_auth_ping():
	app = create_app()
	client = app.test_client()
	resp = client.get("/api/auth/ping")
	assert resp.status_code == 200
	assert resp.get_json()["message"] == "auth service up"

