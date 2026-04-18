import sqlite3
import os

db_path = r'c:\Users\kavin\OneDrive\Desktop\wholesale business management\Wholesale-business-management\backend\supplynest.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("PRAGMA table_info(orders)")
cols = cur.fetchall()
for col in cols:
    print(col)
conn.close()
