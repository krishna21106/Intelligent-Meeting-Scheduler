package com.cnip.nms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "metrics")
public class Metric {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false)
    private Double cpuUsage;

    @Column(nullable = false)
    private Double memoryUsage;

    @Column(nullable = false)
    private Double latencyMs;

    @Column(nullable = false)
    private Double packetLossPct = 0.0;

    @Column(nullable = false)
    private Long bytesInPerSec = 0L;

    @Column(nullable = false)
    private Long bytesOutPerSec = 0L;

    @Column(nullable = false)
    private Long uptimeSeconds = 0L;

    @Column(nullable = false)
    private LocalDateTime recordedAt;

    public Metric() {}

    public Metric(Long id, Device device, Double cpuUsage, Double memoryUsage, Double latencyMs,
                  Double packetLossPct, Long bytesInPerSec, Long bytesOutPerSec, Long uptimeSeconds,
                  LocalDateTime recordedAt) {
        this.id = id;
        this.device = device;
        this.cpuUsage = cpuUsage;
        this.memoryUsage = memoryUsage;
        this.latencyMs = latencyMs;
        this.packetLossPct = packetLossPct != null ? packetLossPct : 0.0;
        this.bytesInPerSec = bytesInPerSec != null ? bytesInPerSec : 0L;
        this.bytesOutPerSec = bytesOutPerSec != null ? bytesOutPerSec : 0L;
        this.uptimeSeconds = uptimeSeconds != null ? uptimeSeconds : 0L;
        this.recordedAt = recordedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }
    public Double getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(Double cpuUsage) { this.cpuUsage = cpuUsage; }
    public Double getMemoryUsage() { return memoryUsage; }
    public void setMemoryUsage(Double memoryUsage) { this.memoryUsage = memoryUsage; }
    public Double getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Double latencyMs) { this.latencyMs = latencyMs; }
    public Double getPacketLossPct() { return packetLossPct; }
    public void setPacketLossPct(Double packetLossPct) { this.packetLossPct = packetLossPct; }
    public Long getBytesInPerSec() { return bytesInPerSec; }
    public void setBytesInPerSec(Long bytesInPerSec) { this.bytesInPerSec = bytesInPerSec; }
    public Long getBytesOutPerSec() { return bytesOutPerSec; }
    public void setBytesOutPerSec(Long bytesOutPerSec) { this.bytesOutPerSec = bytesOutPerSec; }
    public Long getUptimeSeconds() { return uptimeSeconds; }
    public void setUptimeSeconds(Long uptimeSeconds) { this.uptimeSeconds = uptimeSeconds; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Device device;
        private Double cpuUsage;
        private Double memoryUsage;
        private Double latencyMs;
        private Double packetLossPct = 0.0;
        private Long bytesInPerSec = 0L;
        private Long bytesOutPerSec = 0L;
        private Long uptimeSeconds = 0L;
        private LocalDateTime recordedAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder device(Device device) { this.device = device; return this; }
        public Builder cpuUsage(Double cpuUsage) { this.cpuUsage = cpuUsage; return this; }
        public Builder memoryUsage(Double memoryUsage) { this.memoryUsage = memoryUsage; return this; }
        public Builder latencyMs(Double latencyMs) { this.latencyMs = latencyMs; return this; }
        public Builder packetLossPct(Double packetLossPct) { this.packetLossPct = packetLossPct; return this; }
        public Builder bytesInPerSec(Long bytesInPerSec) { this.bytesInPerSec = bytesInPerSec; return this; }
        public Builder bytesOutPerSec(Long bytesOutPerSec) { this.bytesOutPerSec = bytesOutPerSec; return this; }
        public Builder uptimeSeconds(Long uptimeSeconds) { this.uptimeSeconds = uptimeSeconds; return this; }
        public Builder recordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; return this; }
        public Metric build() {
            return new Metric(id, device, cpuUsage, memoryUsage, latencyMs, packetLossPct, bytesInPerSec, bytesOutPerSec, uptimeSeconds, recordedAt);
        }
    }
}
