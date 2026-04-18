import sqlite3
db_path = r'c:\Users\kavin\OneDrive\Desktop\wholesale business management\Wholesale-business-management\backend\supplynest.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("PRAGMA table_info(payments)")
for col in cur.fetchall(): print(col)
conn.close()
