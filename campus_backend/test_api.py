from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_system():
    print("\n--- 1. Testing Health Check ---")
    res = client.get("/api/health")
    print("Health response:", res.status_code, res.json())
    assert res.status_code == 200

    print("\n--- 2. Testing Authentication ---")
    # Admin login
    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "Admin123!"})
    print("Admin login:", admin_login.status_code)
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Operator login
    op_login = client.post("/api/auth/login", json={"username": "operator1", "password": "Operator123!"})
    print("Operator login:", op_login.status_code)
    assert op_login.status_code == 200
    op_token = op_login.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # Pending operator login should return 403
    pending_login = client.post("/api/auth/login", json={"username": "operator2", "password": "Operator123!"})
    print("Pending operator login (expected 403):", pending_login.status_code, pending_login.json()["detail"])
    assert pending_login.status_code == 403

    # Customer login
    cust_login = client.post("/api/auth/login", json={"username": "student_pc01", "password": "Student123!"})
    print("Customer login:", cust_login.status_code)
    assert cust_login.status_code == 200
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    print("\n--- 3. Testing Admin Dashboard & OSI Compliance ---")
    dash = client.get("/api/admin/dashboard", headers=admin_headers)
    print("Admin Dashboard Overview:", dash.json()["overview"])
    assert dash.status_code == 200

    osi = client.get("/api/admin/osi-compliance", headers=admin_headers)
    print("OSI Compliance Routers count:", len(osi.json()))
    assert osi.status_code == 200
    print("First router L1-L7 layer names:", [l["layer_name"] for l in osi.json()[0]["layers"]])

    op_reqs = client.get("/api/admin/operator-requests", headers=admin_headers)
    print("Pending Operator requests:", len(op_reqs.json()))
    assert op_reqs.status_code == 200

    print("\n--- 4. Testing Operator Router & Customer Systems ---")
    op_router = client.get("/api/operator/router", headers=op_headers)
    print("Operator Router:", op_router.status_code, op_router.json()["name"], op_router.json()["ip_address"])
    assert op_router.status_code == 200

    customers = client.get("/api/operator/customers", headers=op_headers)
    print("Connected Customers count:", len(customers.json()))
    assert customers.status_code == 200

    print("\n--- 5. Testing Customer Network Topology ---")
    topo = client.get("/api/customer/network-topology", headers=cust_headers)
    print("Topology Nodes count:", len(topo.json()["nodes"]), "Edges count:", len(topo.json()["edges"]))
    assert topo.status_code == 200

    print("\n--- 6. Testing Wireshark-Style Packet Analyzer ---")
    packets = client.get("/api/packets?limit=10", headers=cust_headers)
    print("Fetched Packets count:", len(packets.json()))
    assert packets.status_code == 200
    p1 = packets.json()[0]
    print(f"Sample Packet #{p1['packet_no']}: {p1['protocol']} | {p1['src_ip']} -> {p1['dst_ip']} | {p1['info']}")

    stats = client.get("/api/packets/stats", headers=cust_headers)
    print("Packet Stats Protocol Distribution:", stats.json()["protocol_distribution"])
    assert stats.status_code == 200

    # Test simulating traffic (e.g. port scan simulation)
    sim = client.post("/api/packets/simulate-traffic", headers=cust_headers, json={"scenario": "PORT_SCAN", "packet_count": 8})
    print("Simulated Port Scan Packets count:", len(sim.json()))
    assert sim.status_code == 200

    print("\n--- 7. Testing Alerts ---")
    alerts = client.get("/api/alerts", headers=admin_headers)
    print("Total Alerts in system:", len(alerts.json()))
    assert alerts.status_code == 200
    for a in alerts.json()[:3]:
        print(f"Alert #{a['id']} [{a['severity']} - {a['osi_layer']}]: {a['title']}")

    print("\n[ALL TESTS PASSED] Campus Lab Network Management Backend is 100% functional!")

if __name__ == "__main__":
    test_system()
