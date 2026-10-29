package com.cnip.nms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ip_addresses")
public class IpAddress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 45)
    private String ipAddress;

    @Column(nullable = false, length = 50)
    private String subnet;

    @Column(nullable = false, length = 20)
    private String status = "AVAILABLE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vlan_id")
    private Vlan vlan;

    @Column(length = 150)
    private String dnsName;

    public IpAddress() {}

    public IpAddress(Long id, String ipAddress, String subnet, String status, Device device, Vlan vlan, String dnsName) {
        this.id = id;
        this.ipAddress = ipAddress;
        this.subnet = subnet;
        this.status = status != null ? status : "AVAILABLE";
        this.device = device;
        this.vlan = vlan;
        this.dnsName = dnsName;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getSubnet() { return subnet; }
    public void setSubnet(String subnet) { this.subnet = subnet; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }
    public Vlan getVlan() { return vlan; }
    public void setVlan(Vlan vlan) { this.vlan = vlan; }
    public String getDnsName() { return dnsName; }
    public void setDnsName(String dnsName) { this.dnsName = dnsName; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String ipAddress;
        private String subnet;
        private String status = "AVAILABLE";
        private Device device;
        private Vlan vlan;
        private String dnsName;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
        public Builder subnet(String subnet) { this.subnet = subnet; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder device(Device device) { this.device = device; return this; }
        public Builder vlan(Vlan vlan) { this.vlan = vlan; return this; }
        public Builder dnsName(String dnsName) { this.dnsName = dnsName; return this; }
        public IpAddress build() { return new IpAddress(id, ipAddress, subnet, status, device, vlan, dnsName); }
    }
}
