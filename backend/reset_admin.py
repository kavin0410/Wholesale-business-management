
import sqlite3
import hashlib
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "supplynest.db")

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def reset_admin():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        new_password = "admin123"
        hashed = _hash(new_password)
        
        cursor.execute("UPDATE users SET password = ? WHERE username = ?", (hashed, "admin"))
        if cursor.rowcount == 0:
            print("Admin user not found in database.")
        else:
            conn.commit()
            print(f"Successfully reset password for 'admin' to '{new_password}'")
            print(f"New hash: {hashed}")
            
    except Exception as e:
        print(f"Error resetting password: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    reset_admin()
