package com.cnip.nms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "devices")
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 45)
    private String ipAddress;

    @Column(nullable = false, length = 50)
    private String deviceType;

    @Column(nullable = false, length = 100)
    private String vendor;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(nullable = false, length = 100)
    private String site;

    @Column(length = 150)
    private String location;

    @Column(nullable = false, length = 50)
    private String status = "UP";

    @Column(length = 20)
    private String snmpVersion = "v2c";

    @Column(length = 100)
    private String snmpCommunity = "public";

    private Integer snmpPort = 161;

    @Column(length = 255)
    private String tags;

    @Column(name = "customer_id")
    private Long customerId;

    private LocalDateTime lastSeen;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InterfaceEntity> interfaces = new ArrayList<>();

    public Device() {}

    public Device(Long id, String name, String ipAddress, String deviceType, String vendor, String model,
                  String site, String location, String status, String snmpVersion, String snmpCommunity,
                  Integer snmpPort, String tags, Long customerId, LocalDateTime lastSeen, LocalDateTime createdAt,
                  List<InterfaceEntity> interfaces) {
        this.id = id;
        this.name = name;
        this.ipAddress = ipAddress;
        this.deviceType = deviceType;
        this.vendor = vendor;
        this.model = model;
        this.site = site;
        this.location = location;
        this.status = status != null ? status : "UP";
        this.snmpVersion = snmpVersion != null ? snmpVersion : "v2c";
        this.snmpCommunity = snmpCommunity != null ? snmpCommunity : "public";
        this.snmpPort = snmpPort != null ? snmpPort : 161;
        this.tags = tags;
        this.customerId = customerId;
        this.lastSeen = lastSeen;
        this.createdAt = createdAt;
        if (interfaces != null) {
            this.interfaces = interfaces;
        }
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (lastSeen == null) {
            lastSeen = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }
    public String getVendor() { return vendor; }
    public void setVendor(String vendor) { this.vendor = vendor; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSite() { return site; }
    public void setSite(String site) { this.site = site; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSnmpVersion() { return snmpVersion; }
    public void setSnmpVersion(String snmpVersion) { this.snmpVersion = snmpVersion; }
    public String getSnmpCommunity() { return snmpCommunity; }
    public void setSnmpCommunity(String snmpCommunity) { this.snmpCommunity = snmpCommunity; }
    public Integer getSnmpPort() { return snmpPort; }
    public void setSnmpPort(Integer snmpPort) { this.snmpPort = snmpPort; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<InterfaceEntity> getInterfaces() { return interfaces; }
    public void setInterfaces(List<InterfaceEntity> interfaces) { this.interfaces = interfaces; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String name;
        private String ipAddress;
        private String deviceType;
        private String vendor;
        private String model;
        private String site;
        private String location;
        private String status = "UP";
        private String snmpVersion = "v2c";
        private String snmpCommunity = "public";
        private Integer snmpPort = 161;
        private String tags;
        private Long customerId;
        private LocalDateTime lastSeen;
        private LocalDateTime createdAt;
        private List<InterfaceEntity> interfaces = new ArrayList<>();

        public Builder id(Long id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
        public Builder deviceType(String deviceType) { this.deviceType = deviceType; return this; }
        public Builder vendor(String vendor) { this.vendor = vendor; return this; }
        public Builder model(String model) { this.model = model; return this; }
        public Builder site(String site) { this.site = site; return this; }
        public Builder location(String location) { this.location = location; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder snmpVersion(String snmpVersion) { this.snmpVersion = snmpVersion; return this; }
        public Builder snmpCommunity(String snmpCommunity) { this.snmpCommunity = snmpCommunity; return this; }
        public Builder snmpPort(Integer snmpPort) { this.snmpPort = snmpPort; return this; }
        public Builder tags(String tags) { this.tags = tags; return this; }
        public Builder customerId(Long customerId) { this.customerId = customerId; return this; }
        public Builder lastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder interfaces(List<InterfaceEntity> interfaces) { this.interfaces = interfaces; return this; }
        public Device build() {
            return new Device(id, name, ipAddress, deviceType, vendor, model, site, location, status,
                    snmpVersion,                     snmpCommunity, snmpPort, tags, customerId, lastSeen, createdAt, interfaces);
        }
    }
}
