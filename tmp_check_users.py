
import sqlite3
import hashlib
import os

db_path = r"c:\Users\rohan\OneDrive\Documents\Desktop\antidbms\Wholesale-business-management\backend\supplynest.db"

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, password, role FROM users")
        users = cursor.fetchall()
        print("Users in DB:")
        for user in users:
            print(f"ID: {user[0]}, Username: {user[1]}, Password: {user[2]}, Role: {user[3]}")
            
        target_pw = "admin123"
        print(f"\nHash for '{target_pw}':", _hash(target_pw))
        
        # Check if match
        for user in users:
            if user[1] == "admin":
                if user[2] == _hash(target_pw):
                    print("Admin password MATCHES 'admin123'")
                else:
                    print(f"Admin password DOES NOT MATCH 'admin123'. DB has {user[2]}")
                    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
