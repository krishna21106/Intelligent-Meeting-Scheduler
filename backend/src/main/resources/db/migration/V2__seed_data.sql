-- Seed Users (passwords: Admin123!, Operator123!, Viewer123!)
INSERT INTO users (username, password_hash, email, role_name, created_at) VALUES
('admin', '$2a$10$w85J.Xk7Hk7GjKqT.wO5IOM3c6l0eXm8B3F2qZ9Y5L6O0V8w2S6s.', 'admin@cnip.network', 'ADMIN', CURRENT_TIMESTAMP),
('operator', '$2a$10$w85J.Xk7Hk7GjKqT.wO5IOM3c6l0eXm8B3F2qZ9Y5L6O0V8w2S6s.', 'operator@cnip.network', 'OPERATOR', CURRENT_TIMESTAMP),
('viewer', '$2a$10$w85J.Xk7Hk7GjKqT.wO5IOM3c6l0eXm8B3F2qZ9Y5L6O0V8w2S6s.', 'viewer@cnip.network', 'VIEWER', CURRENT_TIMESTAMP);

-- Seed Alert Rules
INSERT INTO alert_rules (name, metric_type, operator, threshold_value, duration_seconds, severity, enabled) VALUES
('High CPU Utilization', 'CPU', 'GREATER_THAN', 85.0, 300, 'CRITICAL', true),
('High Memory Consumption', 'MEMORY', 'GREATER_THAN', 90.0, 300, 'CRITICAL', true),
('Elevated Ping Latency', 'LATENCY', 'GREATER_THAN', 80.0, 120, 'WARNING', true),
('Packet Loss Detected', 'PACKET_LOSS', 'GREATER_THAN', 2.0, 60, 'WARNING', true),
('Device Unreachable', 'STATUS', 'EQUALS', 0.0, 30, 'CRITICAL', true);

-- Seed VLANs (with explicit PK id: 1..5)
INSERT INTO vlans (id, vlan_id, name, subnet, description) VALUES
(1, 10, 'Corporate Management', '10.10.10.0/24', 'Out-of-band network management & SNMP'),
(2, 20, 'Engineering Workstations', '10.10.20.0/24', 'Core engineering & development network'),
(3, 30, 'Datacenter Server Farm', '10.10.30.0/24', 'Bare metal & virtualized compute cluster'),
(4, 40, 'DMZ / Perimeter', '10.10.40.0/24', 'Public-facing reverse proxies and APIs'),
(5, 50, 'Corporate Wi-Fi', '10.10.50.0/24', 'Employee 802.1x wireless segment');

ALTER TABLE vlans ALTER COLUMN id RESTART WITH 6;

-- Seed Notification Settings
INSERT INTO notification_settings (email_enabled, recipient_emails, webhook_enabled, webhook_url, min_severity, updated_at) VALUES
(true, 'noc-alerts@cnip.network', true, 'https://webhook.cnip.network/alerts/v1/incoming', 'WARNING', CURRENT_TIMESTAMP);

-- Seed Devices (40 devices across 3 sites)
-- HQ - New York (16 devices)
INSERT INTO devices (id, name, ip_address, device_type, vendor, model, site, location, status, snmp_version, snmp_community, snmp_port, tags, last_seen, created_at) VALUES
(1, 'nyc-core-rtr-01', '10.10.1.1', 'ROUTER', 'Cisco', 'Catalyst 8500', 'HQ - New York', 'Rack A1', 'UP', 'v2c', 'cnip_pub', 161, 'core,backbone,primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'nyc-core-rtr-02', '10.10.1.2', 'ROUTER', 'Cisco', 'Catalyst 8500', 'HQ - New York', 'Rack A2', 'UP', 'v2c', 'cnip_pub', 161, 'core,backbone,secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'nyc-edge-fw-01', '10.10.1.10', 'FIREWALL', 'Fortinet', 'FortiGate 200F', 'HQ - New York', 'Rack A3', 'UP', 'v2c', 'cnip_pub', 161, 'perimeter,firewall,ha-primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'nyc-edge-fw-02', '10.10.1.11', 'FIREWALL', 'Fortinet', 'FortiGate 200F', 'HQ - New York', 'Rack A4', 'UP', 'v2c', 'cnip_pub', 161, 'perimeter,firewall,ha-secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'nyc-dist-sw-01', '10.10.2.1', 'SWITCH', 'Arista', '7050SX3', 'HQ - New York', 'Rack B1', 'UP', 'v2c', 'cnip_pub', 161, 'distribution,100g,spine', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'nyc-dist-sw-02', '10.10.2.2', 'SWITCH', 'Arista', '7050SX3', 'HQ - New York', 'Rack B2', 'UP', 'v2c', 'cnip_pub', 161, 'distribution,100g,spine', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'nyc-acc-sw-01', '10.10.3.1', 'SWITCH', 'Cisco', 'Catalyst 9300', 'HQ - New York', 'Floor 2 IDF', 'UP', 'v2c', 'cnip_pub', 161, 'access,poe,users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'nyc-acc-sw-02', '10.10.3.2', 'SWITCH', 'Cisco', 'Catalyst 9300', 'HQ - New York', 'Floor 3 IDF', 'UP', 'v2c', 'cnip_pub', 161, 'access,poe,users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'nyc-acc-sw-03', '10.10.3.3', 'SWITCH', 'Cisco', 'Catalyst 9300', 'HQ - New York', 'Floor 4 IDF', 'UP', 'v2c', 'cnip_pub', 161, 'access,poe,users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'nyc-acc-sw-04', '10.10.3.4', 'SWITCH', 'Cisco', 'Catalyst 9300', 'HQ - New York', 'Floor 5 IDF', 'UP', 'v2c', 'cnip_pub', 161, 'access,poe,users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'nyc-wifi-ap-01', '10.10.4.10', 'ACCESS_POINT', 'Aruba', 'AP-555 Wi-Fi 6', 'HQ - New York', 'Floor 2 Lobby', 'UP', 'v2c', 'cnip_pub', 161, 'wifi,lobby,guest', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'nyc-wifi-ap-02', '10.10.4.11', 'ACCESS_POINT', 'Aruba', 'AP-555 Wi-Fi 6', 'HQ - New York', 'Floor 3 Conf Room', 'UP', 'v2c', 'cnip_pub', 161, 'wifi,conference', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'nyc-wifi-ap-03', '10.10.4.12', 'ACCESS_POINT', 'Aruba', 'AP-555 Wi-Fi 6', 'HQ - New York', 'Floor 4 Exec', 'WARNING', 'v2c', 'cnip_pub', 161, 'wifi,executive,high-latency', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'nyc-srv-auth-01', '10.10.5.10', 'SERVER', 'Dell', 'PowerEdge R650', 'HQ - New York', 'DC Room A', 'DOWN', 'v2c', 'cnip_pub', 161, 'server,radius,identity', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'nyc-srv-dns-01', '10.10.5.11', 'SERVER', 'Dell', 'PowerEdge R650', 'HQ - New York', 'DC Room A', 'UP', 'v2c', 'cnip_pub', 161, 'server,dns,dhcp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, 'nyc-srv-mon-01', '10.10.5.12', 'SERVER', 'Dell', 'PowerEdge R750', 'HQ - New York', 'DC Room A', 'UP', 'v2c', 'cnip_pub', 161, 'server,nms,telemetry', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- DC - Ashburn (14 devices)
(17, 'ash-border-gw-01', '10.20.1.1', 'ROUTER', 'Juniper', 'MX204', 'DC - Ashburn', 'Row 1-01', 'UP', 'v2c', 'cnip_pub', 161, 'border,bgp,transit-a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'ash-border-gw-02', '10.20.1.2', 'ROUTER', 'Juniper', 'MX204', 'DC - Ashburn', 'Row 1-02', 'UP', 'v2c', 'cnip_pub', 161, 'border,bgp,transit-b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'ash-sec-fw-01', '10.20.1.10', 'FIREWALL', 'Palo Alto', 'PA-3260', 'DC - Ashburn', 'Row 1-03', 'UP', 'v2c', 'cnip_pub', 161, 'dc-firewall,ngfw,dmz', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'ash-spine-sw-01', '10.20.2.1', 'SWITCH', 'Arista', '7280R3', 'DC - Ashburn', 'Row 2-01', 'UP', 'v2c', 'cnip_pub', 161, 'spine,400g,fabric', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(21, 'ash-spine-sw-02', '10.20.2.2', 'SWITCH', 'Arista', '7280R3', 'DC - Ashburn', 'Row 2-02', 'UP', 'v2c', 'cnip_pub', 161, 'spine,400g,fabric', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(22, 'ash-leaf-sw-01', '10.20.3.1', 'SWITCH', 'Cisco', 'Nexus 9300', 'DC - Ashburn', 'Row 3-01', 'UP', 'v2c', 'cnip_pub', 161, 'leaf,tor,compute-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(23, 'ash-leaf-sw-02', '10.20.3.2', 'SWITCH', 'Cisco', 'Nexus 9300', 'DC - Ashburn', 'Row 3-02', 'UP', 'v2c', 'cnip_pub', 161, 'leaf,tor,compute-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(24, 'ash-leaf-sw-03', '10.20.3.3', 'SWITCH', 'Cisco', 'Nexus 9300', 'DC - Ashburn', 'Row 3-03', 'WARNING', 'v2c', 'cnip_pub', 161, 'leaf,tor,storage,congested', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(25, 'ash-leaf-sw-04', '10.20.3.4', 'SWITCH', 'Cisco', 'Nexus 9300', 'DC - Ashburn', 'Row 3-04', 'UP', 'v2c', 'cnip_pub', 161, 'leaf,tor,compute-3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(26, 'ash-db-primary-01', '10.20.5.1', 'SERVER', 'Dell', 'PowerEdge R750xs', 'DC - Ashburn', 'Row 4-01', 'UP', 'v2c', 'cnip_pub', 161, 'database,postgresql,primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(27, 'ash-db-replica-01', '10.20.5.2', 'SERVER', 'Dell', 'PowerEdge R750xs', 'DC - Ashburn', 'Row 4-02', 'UP', 'v2c', 'cnip_pub', 161, 'database,postgresql,replica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(28, 'ash-k8s-ctrl-01', '10.20.5.10', 'SERVER', 'HPE', 'ProLiant DL380', 'DC - Ashburn', 'Row 5-01', 'UP', 'v2c', 'cnip_pub', 161, 'kubernetes,control-plane', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(29, 'ash-k8s-worker-01', '10.20.5.11', 'SERVER', 'HPE', 'ProLiant DL380', 'DC - Ashburn', 'Row 5-02', 'UP', 'v2c', 'cnip_pub', 161, 'kubernetes,worker-node', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(30, 'ash-san-storage-01', '10.20.5.20', 'SERVER', 'NetApp', 'AFF A250', 'DC - Ashburn', 'Row 6-01', 'MAINTENANCE', 'v2c', 'cnip_pub', 161, 'storage,nvme,san,firmware-update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Branch - Frankfurt (10 devices)
(31, 'fra-sdwan-gw-01', '10.30.1.1', 'ROUTER', 'Cisco', 'Catalyst 8300', 'Branch - Frankfurt', 'Branch Rack 1', 'UP', 'v2c', 'cnip_pub', 161, 'sdwan,branch-gw,mpls', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(32, 'fra-edge-fw-01', '10.30.1.10', 'FIREWALL', 'Fortinet', 'FortiGate 100F', 'Branch - Frankfurt', 'Branch Rack 1', 'UP', 'v2c', 'cnip_pub', 161, 'branch-fw,vpn-ipsec', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(33, 'fra-core-sw-01', '10.30.2.1', 'SWITCH', 'Aruba', 'CX 6300', 'Branch - Frankfurt', 'Branch Rack 2', 'UP', 'v2c', 'cnip_pub', 161, 'branch-core,vlan-routing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(34, 'fra-acc-sw-01', '10.30.3.1', 'SWITCH', 'Aruba', 'CX 6100', 'Branch - Frankfurt', 'Floor 1 IDF', 'UP', 'v2c', 'cnip_pub', 161, 'branch-access,poe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(35, 'fra-acc-sw-02', '10.30.3.2', 'SWITCH', 'Aruba', 'CX 6100', 'Branch - Frankfurt', 'Floor 2 IDF', 'DOWN', 'v2c', 'cnip_pub', 161, 'branch-access,poe,down', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(36, 'fra-wifi-ap-01', '10.30.4.1', 'ACCESS_POINT', 'Aruba', 'AP-515 Wi-Fi 6', 'Branch - Frankfurt', 'Floor 1 West', 'UP', 'v2c', 'cnip_pub', 161, 'branch-wifi,mesh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(37, 'fra-wifi-ap-02', '10.30.4.2', 'ACCESS_POINT', 'Aruba', 'AP-515 Wi-Fi 6', 'Branch - Frankfurt', 'Floor 1 East', 'UP', 'v2c', 'cnip_pub', 161, 'branch-wifi,mesh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(38, 'fra-wifi-ap-03', '10.30.4.3', 'ACCESS_POINT', 'Aruba', 'AP-515 Wi-Fi 6', 'Branch - Frankfurt', 'Floor 2 Hall', 'UP', 'v2c', 'cnip_pub', 161, 'branch-wifi,mesh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(39, 'fra-srv-app-01', '10.30.5.1', 'SERVER', 'Dell', 'PowerEdge R450', 'Branch - Frankfurt', 'Server Room', 'UP', 'v2c', 'cnip_pub', 161, 'branch-local,edge-compute', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(40, 'fra-srv-backup-01', '10.30.5.2', 'SERVER', 'Dell', 'PowerEdge R450', 'Branch - Frankfurt', 'Server Room', 'UP', 'v2c', 'cnip_pub', 161, 'branch-backup,nas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Reset sequence if needed for postgres
ALTER TABLE devices ALTER COLUMN id RESTART WITH 41;

-- Seed Interfaces for devices
INSERT INTO interfaces (device_id, name, mac_address, ip_address, status, speed_bps, in_octets, out_octets, in_errors, out_errors) VALUES
(1, 'GigabitEthernet0/0/0', '00:1A:2B:3C:4D:01', '10.10.1.1', 'UP', 10000000000, 84729104820, 92837419820, 0, 0),
(1, 'TenGigabitEthernet0/1/0', '00:1A:2B:3C:4D:02', '192.168.100.1', 'UP', 10000000000, 142981048200, 138294019280, 2, 0),
(1, 'GigabitEthernet0/0/1', '00:1A:2B:3C:4D:03', '10.10.1.254', 'UP', 1000000000, 2948102938, 3819203948, 0, 0),
(2, 'GigabitEthernet0/0/0', '00:1A:2B:3C:4D:04', '10.10.1.2', 'UP', 10000000000, 78291048200, 84837419820, 0, 0),
(2, 'TenGigabitEthernet0/1/0', '00:1A:2B:3C:4D:05', '192.168.100.2', 'UP', 10000000000, 112981048200, 108294019280, 0, 0),
(3, 'port1 (WAN)', '00:09:0F:7B:8A:01', '203.0.113.1', 'UP', 10000000000, 294819203910, 319283019280, 12, 4),
(3, 'port2 (LAN-Core)', '00:09:0F:7B:8A:02', '10.10.1.10', 'UP', 10000000000, 319283019280, 294819203910, 0, 0),
(4, 'port1 (WAN)', '00:09:0F:7B:8A:03', '203.0.113.2', 'UP', 10000000000, 4819203910, 5283019280, 0, 0),
(5, 'Ethernet1/1 (Trunk-NYC-Dist2)', '00:1C:73:9A:01:01', NULL, 'UP', 40000000000, 682948102938, 712938491029, 0, 0),
(5, 'Ethernet1/2 (Uplink-Core1)', '00:1C:73:9A:01:02', '10.10.2.1', 'UP', 10000000000, 381928491029, 391029384710, 0, 0),
(6, 'Ethernet1/1 (Trunk-NYC-Dist1)', '00:1C:73:9A:02:01', NULL, 'UP', 40000000000, 712938491029, 682948102938, 0, 0),
(14, 'eno1', 'F8:4A:BF:11:22:33', '10.10.5.10', 'DOWN', 1000000000, 0, 0, 142, 88),
(17, 'et-0/0/0 (Internet-Transit-A)', '00:05:85:12:34:56', '198.51.100.1', 'UP', 100000000000, 9481029384710, 9182736451029, 3, 1),
(18, 'et-0/0/0 (Internet-Transit-B)', '00:05:85:12:34:57', '198.51.100.5', 'UP', 100000000000, 8910293847102, 8762514251029, 1, 0),
(20, 'Ethernet1 (Fabric-Spine1)', '00:1C:73:88:11:01', '10.20.2.1', 'UP', 100000000000, 15481029384710, 14982736451029, 0, 0),
(24, 'Ethernet1/48 (Storage-Congested)', '00:1C:73:88:44:48', '10.20.3.3', 'UP', 25000000000, 8928374198200, 9481029384710, 521, 280),
(31, 'GigabitEthernet0/0/0', '00:26:98:A1:B2:C1', '10.30.1.1', 'UP', 1000000000, 12948102938, 14819203948, 0, 0),
(35, 'GigabitEthernet1/0/1', '00:0B:86:DD:EE:01', '10.30.3.2', 'DOWN', 1000000000, 0, 0, 89, 44);

-- Seed Initial Metrics for Devices (Snapshot)
INSERT INTO metrics (device_id, cpu_usage, memory_usage, latency_ms, packet_loss_pct, bytes_in_per_sec, bytes_out_per_sec, uptime_seconds, recorded_at) VALUES
(1, 38.5, 54.2, 3.2, 0.0, 48291040, 51203940, 4820194, CURRENT_TIMESTAMP),
(2, 34.1, 51.0, 3.4, 0.0, 42104920, 45910290, 4820194, CURRENT_TIMESTAMP),
(3, 42.0, 68.4, 2.1, 0.0, 85910290, 89401920, 3918290, CURRENT_TIMESTAMP),
(4, 18.2, 45.1, 2.2, 0.0, 1290380, 1481920, 3918290, CURRENT_TIMESTAMP),
(5, 58.7, 62.0, 1.8, 0.0, 129481020, 134910290, 5910293, CURRENT_TIMESTAMP),
(6, 55.3, 60.5, 1.9, 0.0, 118291020, 125910290, 5910293, CURRENT_TIMESTAMP),
(7, 28.4, 48.2, 4.1, 0.0, 18491020, 21940190, 2918204, CURRENT_TIMESTAMP),
(8, 31.0, 49.0, 4.3, 0.0, 19481020, 22491020, 2918204, CURRENT_TIMESTAMP),
(9, 26.5, 47.1, 4.0, 0.0, 16491020, 18940190, 2918204, CURRENT_TIMESTAMP),
(10, 29.8, 50.2, 4.5, 0.0, 17481020, 20491020, 2918204, CURRENT_TIMESTAMP),
(11, 45.2, 63.1, 8.2, 0.1, 8491020, 9481020, 1829103, CURRENT_TIMESTAMP),
(12, 48.0, 65.4, 7.9, 0.0, 9182030, 10291020, 1829103, CURRENT_TIMESTAMP),
(13, 89.4, 82.5, 94.6, 3.8, 14291020, 16491020, 1829103, CURRENT_TIMESTAMP),
(14, 0.0, 0.0, 999.0, 100.0, 0, 0, 0, CURRENT_TIMESTAMP),
(15, 24.1, 41.5, 2.8, 0.0, 5910290, 7182910, 8910294, CURRENT_TIMESTAMP),
(16, 42.6, 59.8, 2.5, 0.0, 14819200, 16910290, 8910294, CURRENT_TIMESTAMP),
(17, 62.4, 69.1, 1.2, 0.0, 481920390, 491029380, 9819204, CURRENT_TIMESTAMP),
(18, 59.8, 67.5, 1.3, 0.0, 459102930, 469102930, 9819204, CURRENT_TIMESTAMP),
(19, 52.0, 74.3, 1.5, 0.0, 381920390, 391029380, 7819204, CURRENT_TIMESTAMP),
(20, 68.5, 71.0, 0.8, 0.0, 981920390, 991029380, 12819204, CURRENT_TIMESTAMP),
(21, 65.2, 69.8, 0.9, 0.0, 941920390, 951029380, 12819204, CURRENT_TIMESTAMP),
(22, 44.1, 58.0, 1.1, 0.0, 84910290, 91029380, 6819204, CURRENT_TIMESTAMP),
(23, 46.2, 59.4, 1.0, 0.0, 89102930, 93102938, 6819204, CURRENT_TIMESTAMP),
(24, 88.6, 88.2, 45.2, 6.4, 184910290, 191029380, 6819204, CURRENT_TIMESTAMP),
(25, 41.0, 55.1, 1.1, 0.0, 79102930, 84102938, 6819204, CURRENT_TIMESTAMP),
(26, 68.2, 84.5, 1.4, 0.0, 49102930, 58102938, 9819204, CURRENT_TIMESTAMP),
(27, 45.1, 78.0, 1.6, 0.0, 39102930, 44102938, 9819204, CURRENT_TIMESTAMP),
(28, 51.4, 69.2, 1.2, 0.0, 34102930, 38102938, 5819204, CURRENT_TIMESTAMP),
(29, 72.8, 81.3, 1.5, 0.0, 68102930, 74102938, 5819204, CURRENT_TIMESTAMP),
(30, 12.0, 34.0, 2.5, 0.0, 12102930, 14102938, 14819204, CURRENT_TIMESTAMP),
(31, 39.4, 52.8, 14.2, 0.0, 28102930, 31102938, 3819204, CURRENT_TIMESTAMP),
(32, 35.0, 61.2, 12.8, 0.0, 24102930, 26102938, 3819204, CURRENT_TIMESTAMP),
(33, 48.2, 57.0, 11.5, 0.0, 39102930, 42102938, 4819204, CURRENT_TIMESTAMP),
(34, 32.1, 46.5, 12.1, 0.0, 18102930, 21102938, 4819204, CURRENT_TIMESTAMP),
(35, 0.0, 0.0, 999.0, 100.0, 0, 0, 0, CURRENT_TIMESTAMP),
(36, 41.5, 59.2, 15.4, 0.2, 9102930, 11102938, 2819204, CURRENT_TIMESTAMP),
(37, 44.0, 62.1, 14.8, 0.0, 10102930, 12102938, 2819204, CURRENT_TIMESTAMP),
(38, 38.6, 56.4, 15.0, 0.1, 8102930, 9810293, 2819204, CURRENT_TIMESTAMP),
(39, 52.1, 68.4, 13.2, 0.0, 18102930, 22102938, 7819204, CURRENT_TIMESTAMP),
(40, 22.4, 45.0, 13.5, 0.0, 8102930, 14102938, 7819204, CURRENT_TIMESTAMP);

-- Seed Initial Alerts (Active & Historical)
INSERT INTO alerts (device_id, rule_id, severity, title, message, status, triggered_at, acknowledged_at, resolved_at, acknowledged_by) VALUES
(14, 5, 'CRITICAL', 'Device Unreachable: nyc-srv-auth-01', 'SNMP ping probe timed out after 3 consecutive attempts. Primary RADIUS/Auth server is non-responsive.', 'ACTIVE', CURRENT_TIMESTAMP, NULL, NULL, NULL),
(35, 5, 'CRITICAL', 'Device Outage: fra-acc-sw-02', 'Uplink port GigabitEthernet1/0/1 state changed to DOWN. Loss of telemetry from Frankfurt Floor 2.', 'ACTIVE', CURRENT_TIMESTAMP, NULL, NULL, NULL),
(24, 1, 'CRITICAL', 'High CPU Utilization: ash-leaf-sw-03', 'CPU core load reached 88.6% exceeding threshold of 85.0% for 300 seconds on ToR Leaf 3.', 'ACTIVE', CURRENT_TIMESTAMP, NULL, NULL, NULL),
(13, 3, 'WARNING', 'Elevated Latency: nyc-wifi-ap-03', 'Average round-trip response time is 94.6ms (threshold 80ms) with 3.8% packet degradation.', 'ACKNOWLEDGED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'operator'),
(3, 4, 'WARNING', 'Interface Error Burst: nyc-edge-fw-01', 'Perimeter interface port1 detected packet error rate above baseline.', 'RESOLVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin');

-- Seed Topology Links
INSERT INTO topology_links (source_device_id, target_device_id, source_interface, target_interface, link_status, bandwidth_utilization_pct, capacity_mbps) VALUES
(1, 3, 'GigabitEthernet0/0/0', 'port2', 'UP', 48.5, 10000),
(2, 4, 'GigabitEthernet0/0/0', 'port2', 'UP', 18.2, 10000),
(1, 2, 'TenGigabitEthernet0/1/0', 'TenGigabitEthernet0/1/0', 'UP', 22.0, 10000),
(1, 5, 'GigabitEthernet0/0/1', 'Ethernet1/2', 'UP', 58.7, 10000),
(2, 6, 'GigabitEthernet0/0/1', 'Ethernet1/2', 'UP', 55.3, 10000),
(5, 6, 'Ethernet1/1', 'Ethernet1/1', 'UP', 42.1, 40000),
(5, 7, 'Ethernet1/10', 'GigabitEthernet1/0/48', 'UP', 28.4, 10000),
(5, 8, 'Ethernet1/11', 'GigabitEthernet1/0/48', 'UP', 31.0, 10000),
(6, 9, 'Ethernet1/10', 'GigabitEthernet1/0/48', 'UP', 26.5, 10000),
(6, 10, 'Ethernet1/11', 'GigabitEthernet1/0/48', 'UP', 29.8, 10000),
(5, 14, 'Ethernet1/20', 'eno1', 'DOWN', 0.0, 1000),
(5, 15, 'Ethernet1/21', 'eno1', 'UP', 24.1, 1000),
(5, 16, 'Ethernet1/22', 'eno1', 'UP', 42.6, 10000),
(7, 11, 'GigabitEthernet1/0/12', 'eth0', 'UP', 38.0, 1000),
(8, 12, 'GigabitEthernet1/0/12', 'eth0', 'UP', 41.5, 1000),
(9, 13, 'GigabitEthernet1/0/12', 'eth0', 'DEGRADED', 89.4, 1000),
(17, 19, 'et-0/0/0', 'port1', 'UP', 62.4, 100000),
(18, 19, 'et-0/0/0', 'port2', 'UP', 59.8, 100000),
(19, 20, 'port10', 'Ethernet1', 'UP', 68.5, 100000),
(19, 21, 'port11', 'Ethernet1', 'UP', 65.2, 100000),
(20, 22, 'Ethernet2', 'Ethernet1/1', 'UP', 44.1, 40000),
(20, 23, 'Ethernet3', 'Ethernet1/1', 'UP', 46.2, 40000),
(21, 24, 'Ethernet2', 'Ethernet1/1', 'DEGRADED', 88.6, 40000),
(21, 25, 'Ethernet3', 'Ethernet1/1', 'UP', 41.0, 40000),
(22, 26, 'Ethernet1/10', 'eno1', 'UP', 68.2, 25000),
(22, 27, 'Ethernet1/11', 'eno1', 'UP', 45.1, 25000),
(23, 28, 'Ethernet1/10', 'eno1', 'UP', 51.4, 25000),
(23, 29, 'Ethernet1/11', 'eno1', 'UP', 72.8, 25000),
(24, 30, 'Ethernet1/48', 'e0a', 'UP', 12.0, 25000),
(1, 17, 'TenGigabitEthernet0/2/0', 'xe-0/1/0', 'UP', 45.0, 10000),
(1, 31, 'TenGigabitEthernet0/3/0', 'GigabitEthernet0/0/0', 'UP', 39.4, 1000),
(31, 32, 'GigabitEthernet0/0/1', 'port1', 'UP', 35.0, 1000),
(32, 33, 'port2', '1/1/48', 'UP', 48.2, 10000),
(33, 34, '1/1/1', '1/1/48', 'UP', 32.1, 1000),
(33, 35, '1/1/2', '1/1/48', 'DOWN', 0.0, 1000),
(34, 36, '1/1/10', 'eth0', 'UP', 41.5, 1000),
(34, 37, '1/1/11', 'eth0', 'UP', 44.0, 1000),
(33, 39, '1/1/20', 'eno1', 'UP', 52.1, 1000),
(33, 40, '1/1/21', 'eno1', 'UP', 22.4, 1000);

-- Seed IP Addresses (IPAM) - referencing valid vlans(id): 1..5
INSERT INTO ip_addresses (ip_address, subnet, status, device_id, vlan_id, dns_name) VALUES
('10.10.1.1', '10.10.1.0/24', 'ALLOCATED', 1, 1, 'nyc-core-rtr-01.cnip.internal'),
('10.10.1.2', '10.10.1.0/24', 'ALLOCATED', 2, 1, 'nyc-core-rtr-02.cnip.internal'),
('10.10.1.10', '10.10.1.0/24', 'ALLOCATED', 3, 1, 'nyc-edge-fw-01.cnip.internal'),
('10.10.2.1', '10.10.2.0/24', 'ALLOCATED', 5, 2, 'nyc-dist-sw-01.cnip.internal'),
('10.10.5.10', '10.10.5.0/24', 'ALLOCATED', 14, 3, 'nyc-srv-auth-01.cnip.internal'),
('10.10.5.11', '10.10.5.0/24', 'ALLOCATED', 15, 3, 'nyc-srv-dns-01.cnip.internal'),
('10.10.5.12', '10.10.5.0/24', 'ALLOCATED', 16, 3, 'nyc-srv-mon-01.cnip.internal'),
('10.10.10.50', '10.10.10.0/24', 'RESERVED', NULL, 1, 'vip-gateway.cnip.internal'),
('10.10.10.51', '10.10.10.0/24', 'AVAILABLE', NULL, 1, NULL),
('10.10.10.52', '10.10.10.0/24', 'AVAILABLE', NULL, 1, NULL);

-- Seed Sample Config Backup
INSERT INTO config_backups (device_id, version, backup_type, configuration, checksum, backed_up_at, backed_up_by) VALUES
(1, 1, 'RUNNING', '! Cisco Catalyst 8500 Running Configuration
version 17.6
service timestamps debug datetime msec
service timestamps log datetime msec
hostname nyc-core-rtr-01
!
ip routing
ip domain name cnip.network
!
interface GigabitEthernet0/0/0
 description WAN to FortiGate Edge 01
 ip address 10.10.1.1 255.255.255.0
 negotiation auto
 no shutdown
!
interface TenGigabitEthernet0/1/0
 description Core Interconnect to NYC-RTR-02
 ip address 192.168.100.1 255.255.255.252
 no shutdown
!
router bgp 65001
 bgp log-neighbor-changes
 neighbor 192.168.100.2 remote-as 65001
!
snmp-server community cnip_pub RO
snmp-server location HQ - New York Rack A1
end', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', CURRENT_TIMESTAMP, 'system-backup-job'),
(1, 2, 'RUNNING', '! Cisco Catalyst 8500 Running Configuration
version 17.6
service timestamps debug datetime msec
service timestamps log datetime msec
hostname nyc-core-rtr-01
!
ip routing
ip domain name cnip.network
!
interface GigabitEthernet0/0/0
 description WAN to FortiGate Edge 01 - Enhanced QoS
 ip address 10.10.1.1 255.255.255.0
 negotiation auto
 service-policy output CORE-EGRESS-POLICY
 no shutdown
!
interface TenGigabitEthernet0/1/0
 description Core Interconnect to NYC-RTR-02
 ip address 192.168.100.1 255.255.255.252
 no shutdown
!
router bgp 65001
 bgp log-neighbor-changes
 neighbor 192.168.100.2 remote-as 65001
!
snmp-server community cnip_pub RO
snmp-server location HQ - New York Rack A1
snmp-server enable traps
end', 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', CURRENT_TIMESTAMP, 'admin');

-- Seed Initial Audit Log
INSERT INTO audit_logs (username, action, entity_type, entity_id, details, client_ip, created_at) VALUES
('system', 'INITIALIZE', 'SYSTEM', 'BOOTSTRAP', 'CNIP Network Manager database initialized with seed topology and devices.', '127.0.0.1', CURRENT_TIMESTAMP),
('admin', 'LOGIN', 'USER', 'admin', 'User admin logged in successfully.', '10.10.5.50', CURRENT_TIMESTAMP);
