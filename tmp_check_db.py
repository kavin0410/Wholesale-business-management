
import sqlite3
import os

db_path = r"c:\Users\rohan\OneDrive\Documents\Desktop\antidbms\Wholesale-business-management\backend\supplynest.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM products")
        p_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM orders")
        o_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM customers")
        c_count = cursor.fetchone()[0]
        
        print(f"Products: {p_count}")
        print(f"Orders: {o_count}")
        print(f"Customers: {c_count}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
