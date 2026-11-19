import sys
import sqlite3
import datetime

sys.path.insert(0, 'campus_backend')
from app.security import hash_password

conn = sqlite3.connect('campus_backend/campus_lab.db')
c = conn.cursor()

now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

# 1. Operator
existing_op = c.execute("SELECT id FROM users WHERE username = 'operator'").fetchone()
if not existing_op:
    h = hash_password('Operator123!')
    c.execute(
        "INSERT INTO users (username, hashed_password, role, full_name, email, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ('operator', h, 'OPERATOR', 'NOC Field Engineer', 'operator@campus.edu', 1, now)
    )
    op_id = c.lastrowid
    c.execute(
        "INSERT INTO operator_requests (user_id, department, employee_id, lab_name, status, reviewed_by_id, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (op_id, 'Computer Science & Engineering', 'EMP-NOC-01', 'Lab 1 - Computer Networks (CNIP)', 'APPROVED', 1, now, now)
    )
    print(f"Inserted operator into campus_lab.db with ID: {op_id}")
else:
    print(f"operator already exists in campus_lab.db with ID: {existing_op[0]}")

# 2. Viewer
existing_v = c.execute("SELECT id FROM users WHERE username = 'viewer'").fetchone()
if not existing_v:
    h = hash_password('Viewer123!')
    c.execute(
        "INSERT INTO users (username, hashed_password, role, full_name, email, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ('viewer', h, 'VIEWER', 'Academic Observer', 'viewer@campus.edu', 1, now)
    )
    print("Inserted viewer into campus_lab.db")
else:
    print("viewer already exists")

# 3. Student
existing_s = c.execute("SELECT id FROM users WHERE username = 'student'").fetchone()
if not existing_s:
    h = hash_password('Student123!')
    c.execute(
        "INSERT INTO users (username, hashed_password, role, full_name, email, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ('student', h, 'CUSTOMER', 'Student Station 01', 'student@campus.edu', 1, now)
    )
    print("Inserted student into campus_lab.db")
else:
    print("student already exists")

conn.commit()
conn.close()
print("All demo accounts verified in campus_lab.db!")
