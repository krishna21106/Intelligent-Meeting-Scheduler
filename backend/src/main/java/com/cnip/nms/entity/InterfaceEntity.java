package com.cnip.nms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interfaces")
public class InterfaceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String macAddress;

    @Column(length = 45)
    private String ipAddress;

    @Column(nullable = false, length = 20)
    private String status = "UP";

    private Long speedBps = 1000000000L;
    private Long inOctets = 0L;
    private Long outOctets = 0L;
    private Long inErrors = 0L;
    private Long outErrors = 0L;
    private LocalDateTime lastUpdated;

    public InterfaceEntity() {}

    public InterfaceEntity(Long id, Device device, String name, String macAddress, String ipAddress,
                           String status, Long speedBps, Long inOctets, Long outOctets, Long inErrors,
                           Long outErrors, LocalDateTime lastUpdated) {
        this.id = id;
        this.device = device;
        this.name = name;
        this.macAddress = macAddress;
        this.ipAddress = ipAddress;
        this.status = status != null ? status : "UP";
        this.speedBps = speedBps != null ? speedBps : 1000000000L;
        this.inOctets = inOctets != null ? inOctets : 0L;
        this.outOctets = outOctets != null ? outOctets : 0L;
        this.inErrors = inErrors != null ? inErrors : 0L;
        this.outErrors = outErrors != null ? outErrors : 0L;
        this.lastUpdated = lastUpdated;
    }

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }
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

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Device device;
        private String name;
        private String macAddress;
        private String ipAddress;
        private String status = "UP";
        private Long speedBps = 1000000000L;
        private Long inOctets = 0L;
        private Long outOctets = 0L;
        private Long inErrors = 0L;
        private Long outErrors = 0L;
        private LocalDateTime lastUpdated;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder device(Device device) { this.device = device; return this; }
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
        public InterfaceEntity build() {
            return new InterfaceEntity(id, device, name, macAddress, ipAddress, status, speedBps, inOctets, outOctets, inErrors, outErrors, lastUpdated);
        }
    }
}
