"""
SQLite database setup — tables, connection helpers, seed data.
"""
import sqlite3, os, hashlib, logging

DB_PATH = os.path.join(os.path.dirname(__file__), "supplynest.db")
logger = logging.getLogger("supplynest")


def get_db():
    """Return a connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def init_db():
    """Create all tables and seed default users if not present."""
    conn = get_db()
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        username    TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'staff'
    );

    CREATE TABLE IF NOT EXISTS suppliers (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL,
        phone   TEXT,
        email   TEXT,
        address TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        category    TEXT,
        cost_price  REAL NOT NULL DEFAULT 0,
        price       REAL NOT NULL DEFAULT 0,
        stock       INTEGER NOT NULL DEFAULT 0,
        supplier_id INTEGER,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL,
        phone   TEXT,
        email   TEXT,
        address TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        product_id  INTEGER NOT NULL,
        quantity    INTEGER NOT NULL,
        discount    REAL DEFAULT 0,
        discount_amt REAL DEFAULT 0,
        total       REAL NOT NULL,
        profit      REAL DEFAULT 0,
        status      TEXT NOT NULL DEFAULT 'Pending',
        payment_method TEXT DEFAULT 'Cash',
        razorpay_id  TEXT,
        date        TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id    INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        amount      REAL NOT NULL,
        method      TEXT NOT NULL,
        date        TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS deliveries (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id        INTEGER UNIQUE NOT NULL,
        status          TEXT NOT NULL DEFAULT 'Packing Order',
        assigned_staff  TEXT,
        expected_date   TEXT,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS delivery_timeline (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER NOT NULL,
        status      TEXT NOT NULL,
        timestamp   TEXT NOT NULL,
        note        TEXT,
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
    );
    """)

    # Seed default users
    for uname, pw, role in [("admin", "admin123", "admin"), ("staff", "staff123", "staff")]:
        existing = cur.execute("SELECT id FROM users WHERE username=?", (uname,)).fetchone()
        if not existing:
            cur.execute("INSERT INTO users (username, password, role) VALUES (?,?,?)",
                        (uname, _hash(pw), role))

    conn.commit()
    conn.close()
    logger.info("Database initialised (%s)", DB_PATH)
