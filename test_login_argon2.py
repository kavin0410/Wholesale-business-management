
import requests

def test_login():
    url = "http://127.0.0.1:8000/api/auth/login"
    payload = {"username": "admin", "password": "admin123"}
    try:
        r = requests.post(url, json=payload)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
