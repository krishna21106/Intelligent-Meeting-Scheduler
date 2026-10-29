package com.cnip.nms.dto;

import java.time.LocalDateTime;

public class MetricDto {
    private Long id;
    private Long deviceId;
    private Double cpuUsage;
    private Double memoryUsage;
    private Double latencyMs;
    private Double packetLossPct;
    private Long bytesInPerSec;
    private Long bytesOutPerSec;
    private Long uptimeSeconds;
    private LocalDateTime recordedAt;

    public MetricDto() {}

    public MetricDto(Long id, Long deviceId, Double cpuUsage, Double memoryUsage, Double latencyMs,
                     Double packetLossPct, Long bytesInPerSec, Long bytesOutPerSec,
                     Long uptimeSeconds, LocalDateTime recordedAt) {
        this.id = id;
        this.deviceId = deviceId;
        this.cpuUsage = cpuUsage;
        this.memoryUsage = memoryUsage;
        this.latencyMs = latencyMs;
        this.packetLossPct = packetLossPct;
        this.bytesInPerSec = bytesInPerSec;
        this.bytesOutPerSec = bytesOutPerSec;
        this.uptimeSeconds = uptimeSeconds;
        this.recordedAt = recordedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }
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
        private Long deviceId;
        private Double cpuUsage;
        private Double memoryUsage;
        private Double latencyMs;
        private Double packetLossPct;
        private Long bytesInPerSec;
        private Long bytesOutPerSec;
        private Long uptimeSeconds;
        private LocalDateTime recordedAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder deviceId(Long deviceId) { this.deviceId = deviceId; return this; }
        public Builder cpuUsage(Double cpuUsage) { this.cpuUsage = cpuUsage; return this; }
        public Builder memoryUsage(Double memoryUsage) { this.memoryUsage = memoryUsage; return this; }
        public Builder latencyMs(Double latencyMs) { this.latencyMs = latencyMs; return this; }
        public Builder packetLossPct(Double packetLossPct) { this.packetLossPct = packetLossPct; return this; }
        public Builder bytesInPerSec(Long bytesInPerSec) { this.bytesInPerSec = bytesInPerSec; return this; }
        public Builder bytesOutPerSec(Long bytesOutPerSec) { this.bytesOutPerSec = bytesOutPerSec; return this; }
        public Builder uptimeSeconds(Long uptimeSeconds) { this.uptimeSeconds = uptimeSeconds; return this; }
        public Builder recordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; return this; }
        public MetricDto build() {
            return new MetricDto(id, deviceId, cpuUsage, memoryUsage, latencyMs, packetLossPct, bytesInPerSec, bytesOutPerSec, uptimeSeconds, recordedAt);
        }
    }
}
