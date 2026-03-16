
from database import init_db, seed_sample_data
import logging

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    print("Re-initializing database...")
    init_db()
    print("Seeding sample data with Bcrypt hashes...")
    seed_sample_data()
    print("Done.")
