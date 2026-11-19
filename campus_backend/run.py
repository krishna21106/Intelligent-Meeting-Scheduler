import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
os.chdir(current_dir)

import uvicorn
from seed_data import seed

if __name__ == "__main__":
    print("[INIT] Verifying database and seed data...")
    try:
        seed()
    except Exception as e:
        print(f"[WARN] Seed data initialization message: {e}")

    print("[START] Starting Campus Lab Network Management Backend on http://0.0.0.0:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
