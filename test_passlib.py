
from passlib.context import CryptContext
import traceback

def test():
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        pw = "admin123"
        print(f"Testing hashing for: {pw}")
        h = pwd_context.hash(pw)
        print(f"Hash: {h}")
        v = pwd_context.verify(pw, h)
        print(f"Verify: {v}")
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    test()
