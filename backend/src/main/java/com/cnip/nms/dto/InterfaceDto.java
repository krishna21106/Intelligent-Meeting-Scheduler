package com.cnip.nms.dto;

import java.time.LocalDateTime;

public class InterfaceDto {
    private Long id;
    private Long deviceId;
    private String deviceName;
    private String name;
    private String macAddress;
    private String ipAddress;
    private String status;
    private Long speedBps;
    private Long inOctets;
    private Long outOctets;
    private Long inErrors;
    private Long outErrors;
    private LocalDateTime lastUpdated;
    private Double utilizationPct;

    public InterfaceDto() {}

    public InterfaceDto(Long id, Long deviceId, String deviceName, String name, String macAddress,
                        String ipAddress, String status, Long speedBps, Long inOctets, Long outOctets,
                        Long inErrors, Long outErrors, LocalDateTime lastUpdated, Double utilizationPct) {
        this.id = id;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.name = name;
        this.macAddress = macAddress;
        this.ipAddress = ipAddress;
        this.status = status;
        this.speedBps = speedBps;
        this.inOctets = inOctets;
        this.outOctets = outOctets;
        this.inErrors = inErrors;
        this.outErrors = outErrors;
        this.lastUpdated = lastUpdated;
        this.utilizationPct = utilizationPct;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getMacAddress() { return macAddress; }
    public void setMacAddress(String macAddress) { this.macAddress = macAddress; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getSpeedBps() { return speedBps; }
    public void setSpeedBps(Long speedBps) { this.speedBps = speedBps; }
    public Long getInOctets() { return inOctets; }
    public void setInOctets(Long inOctets) { this.inOctets = inOctets; }
    public Long getOutOctets() { return outOctets; }
    public void setOutOctets(Long outOctets) { this.outOctets = outOctets; }
    public Long getInErrors() { return inErrors; }
    public void setInErrors(Long inErrors) { this.inErrors = inErrors; }
    public Long getOutErrors() { return outErrors; }
    public void setOutErrors(Long outErrors) { this.outErrors = outErrors; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    public Double getUtilizationPct() { return utilizationPct; }
    public void setUtilizationPct(Double utilizationPct) { this.utilizationPct = utilizationPct; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Long deviceId;
        private String deviceName;
        private String name;
        private String macAddress;
        private String ipAddress;
        private String status;
        private Long speedBps;
        private Long inOctets;
        private Long outOctets;
        private Long inErrors;
        private Long outErrors;
        private LocalDateTime lastUpdated;
        private Double utilizationPct;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder deviceId(Long deviceId) { this.deviceId = deviceId; return this; }
        public Builder deviceName(String deviceName) { this.deviceName = deviceName; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder macAddress(String macAddress) { this.macAddress = macAddress; return this; }
        public Builder ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder speedBps(Long speedBps) { this.speedBps = speedBps; return this; }
        public Builder inOctets(Long inOctets) { this.inOctets = inOctets; return this; }
        public Builder outOctets(Long outOctets) { this.outOctets = outOctets; return this; }
        public Builder inErrors(Long inErrors) { this.inErrors = inErrors; return this; }
        public Builder outErrors(Long outErrors) { this.outErrors = outErrors; return this; }
        public Builder lastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; return this; }
        public Builder utilizationPct(Double utilizationPct) { this.utilizationPct = utilizationPct; return this; }
        public InterfaceDto build() {
            return new InterfaceDto(id, deviceId, deviceName, name, macAddress, ipAddress, status, speedBps, inOctets, outOctets, inErrors, outErrors, lastUpdated, utilizationPct);
        }
    }
}
