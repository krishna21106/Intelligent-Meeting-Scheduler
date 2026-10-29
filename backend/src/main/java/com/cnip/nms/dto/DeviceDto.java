package com.cnip.nms.dto;

import java.time.LocalDateTime;
import java.util.List;

public class DeviceDto {
    private Long id;
    private String name;
    private String ipAddress;
    private String deviceType;
    private String vendor;
    private String model;
    private String site;
    private String location;
    private String status;
    private String snmpVersion;
    private String snmpCommunity;
    private Integer snmpPort;
    private String tags;
    private Long customerId;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;
    private List<InterfaceDto> interfaces;

    private Double latestCpuUsage;
    private Double latestMemoryUsage;
    private Double latestLatencyMs;
    private Double latestPacketLossPct;
    private Long latestUptimeSeconds;

    public DeviceDto() {}

    public DeviceDto(Long id, String name, String ipAddress, String deviceType, String vendor, String model,
                     String site, String location, String status, String snmpVersion, String snmpCommunity,
                     Integer snmpPort, String tags, LocalDateTime lastSeen, LocalDateTime createdAt,
                     List<InterfaceDto> interfaces, Double latestCpuUsage, Double latestMemoryUsage,
                     Double latestLatencyMs, Double latestPacketLossPct, Long latestUptimeSeconds) {
        this.id = id;
        this.name = name;
        this.ipAddress = ipAddress;
        this.deviceType = deviceType;
        this.vendor = vendor;
        this.model = model;
        this.site = site;
        this.location = location;
        this.status = status;
        this.snmpVersion = snmpVersion;
        this.snmpCommunity = snmpCommunity;
        this.snmpPort = snmpPort;
        this.tags = tags;
        this.lastSeen = lastSeen;
        this.createdAt = createdAt;
        this.interfaces = interfaces;
        this.latestCpuUsage = latestCpuUsage;
        this.latestMemoryUsage = latestMemoryUsage;
        this.latestLatencyMs = latestLatencyMs;
        this.latestPacketLossPct = latestPacketLossPct;
        this.latestUptimeSeconds = latestUptimeSeconds;
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
    public List<InterfaceDto> getInterfaces() { return interfaces; }
    public void setInterfaces(List<InterfaceDto> interfaces) { this.interfaces = interfaces; }
    public Double getLatestCpuUsage() { return latestCpuUsage; }
    public void setLatestCpuUsage(Double latestCpuUsage) { this.latestCpuUsage = latestCpuUsage; }
    public Double getLatestMemoryUsage() { return latestMemoryUsage; }
    public void setLatestMemoryUsage(Double latestMemoryUsage) { this.latestMemoryUsage = latestMemoryUsage; }
    public Double getLatestLatencyMs() { return latestLatencyMs; }
    public void setLatestLatencyMs(Double latestLatencyMs) { this.latestLatencyMs = latestLatencyMs; }
    public Double getLatestPacketLossPct() { return latestPacketLossPct; }
    public void setLatestPacketLossPct(Double latestPacketLossPct) { this.latestPacketLossPct = latestPacketLossPct; }
    public Long getLatestUptimeSeconds() { return latestUptimeSeconds; }
    public void setLatestUptimeSeconds(Long latestUptimeSeconds) { this.latestUptimeSeconds = latestUptimeSeconds; }

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
        private String status;
        private String snmpVersion;
        private String snmpCommunity;
        private Integer snmpPort;
        private String tags;
        private Long customerId;
        private LocalDateTime lastSeen;
        private LocalDateTime createdAt;
        private List<InterfaceDto> interfaces;
        private Double latestCpuUsage;
        private Double latestMemoryUsage;
        private Double latestLatencyMs;
        private Double latestPacketLossPct;
        private Long latestUptimeSeconds;

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
        public Builder interfaces(List<InterfaceDto> interfaces) { this.interfaces = interfaces; return this; }
        public Builder latestCpuUsage(Double latestCpuUsage) { this.latestCpuUsage = latestCpuUsage; return this; }
        public Builder latestMemoryUsage(Double latestMemoryUsage) { this.latestMemoryUsage = latestMemoryUsage; return this; }
        public Builder latestLatencyMs(Double latestLatencyMs) { this.latestLatencyMs = latestLatencyMs; return this; }
        public Builder latestPacketLossPct(Double latestPacketLossPct) { this.latestPacketLossPct = latestPacketLossPct; return this; }
        public Builder latestUptimeSeconds(Long latestUptimeSeconds) { this.latestUptimeSeconds = latestUptimeSeconds; return this; }
        public DeviceDto build() {
            DeviceDto dto = new DeviceDto(id, name, ipAddress, deviceType, vendor, model, site, location, status,
                    snmpVersion, snmpCommunity, snmpPort, tags, lastSeen, createdAt, interfaces,
                    latestCpuUsage, latestMemoryUsage, latestLatencyMs, latestPacketLossPct, latestUptimeSeconds);
            dto.setCustomerId(customerId);
            return dto;
        }
    }
}
