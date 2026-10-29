package com.cnip.nms.simulator;

import java.util.List;

public class DevicePollResult {
    private String status;
    private double latencyMs;
    private double cpuUsage;
    private double memoryUsage;
    private double packetLossPct;
    private long bytesInDelta;
    private long bytesOutDelta;
    private long uptimeSeconds;
    private List<InterfacePollData> interfaceData;

    public DevicePollResult() {}

    public DevicePollResult(String status, double latencyMs, double cpuUsage, double memoryUsage,
                            double packetLossPct, long bytesInDelta, long bytesOutDelta,
                            long uptimeSeconds, List<InterfacePollData> interfaceData) {
        this.status = status;
        this.latencyMs = latencyMs;
        this.cpuUsage = cpuUsage;
        this.memoryUsage = memoryUsage;
        this.packetLossPct = packetLossPct;
        this.bytesInDelta = bytesInDelta;
        this.bytesOutDelta = bytesOutDelta;
        this.uptimeSeconds = uptimeSeconds;
        this.interfaceData = interfaceData;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getLatencyMs() { return latencyMs; }
    public void setLatencyMs(double latencyMs) { this.latencyMs = latencyMs; }
    public double getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(double cpuUsage) { this.cpuUsage = cpuUsage; }
    public double getMemoryUsage() { return memoryUsage; }
    public void setMemoryUsage(double memoryUsage) { this.memoryUsage = memoryUsage; }
    public double getPacketLossPct() { return packetLossPct; }
    public void setPacketLossPct(double packetLossPct) { this.packetLossPct = packetLossPct; }
    public long getBytesInDelta() { return bytesInDelta; }
    public void setBytesInDelta(long bytesInDelta) { this.bytesInDelta = bytesInDelta; }
    public long getBytesOutDelta() { return bytesOutDelta; }
    public void setBytesOutDelta(long bytesOutDelta) { this.bytesOutDelta = bytesOutDelta; }
    public long getUptimeSeconds() { return uptimeSeconds; }
    public void setUptimeSeconds(long uptimeSeconds) { this.uptimeSeconds = uptimeSeconds; }
    public List<InterfacePollData> getInterfaceData() { return interfaceData; }
    public void setInterfaceData(List<InterfacePollData> interfaceData) { this.interfaceData = interfaceData; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String status;
        private double latencyMs;
        private double cpuUsage;
        private double memoryUsage;
        private double packetLossPct;
        private long bytesInDelta;
        private long bytesOutDelta;
        private long uptimeSeconds;
        private List<InterfacePollData> interfaceData;

        public Builder status(String status) { this.status = status; return this; }
        public Builder latencyMs(double latencyMs) { this.latencyMs = latencyMs; return this; }
        public Builder cpuUsage(double cpuUsage) { this.cpuUsage = cpuUsage; return this; }
        public Builder memoryUsage(double memoryUsage) { this.memoryUsage = memoryUsage; return this; }
        public Builder packetLossPct(double packetLossPct) { this.packetLossPct = packetLossPct; return this; }
        public Builder bytesInDelta(long bytesInDelta) { this.bytesInDelta = bytesInDelta; return this; }
        public Builder bytesOutDelta(long bytesOutDelta) { this.bytesOutDelta = bytesOutDelta; return this; }
        public Builder uptimeSeconds(long uptimeSeconds) { this.uptimeSeconds = uptimeSeconds; return this; }
        public Builder interfaceData(List<InterfacePollData> interfaceData) { this.interfaceData = interfaceData; return this; }
        public DevicePollResult build() {
            return new DevicePollResult(status, latencyMs, cpuUsage, memoryUsage, packetLossPct, bytesInDelta, bytesOutDelta, uptimeSeconds, interfaceData);
        }
    }

    public static class InterfacePollData {
        private String interfaceName;
        private String status;
        private long inOctetsDelta;
        private long outOctetsDelta;
        private long inErrorsDelta;
        private long outErrorsDelta;

        public InterfacePollData() {}

        public InterfacePollData(String interfaceName, String status, long inOctetsDelta, long outOctetsDelta, long inErrorsDelta, long outErrorsDelta) {
            this.interfaceName = interfaceName;
            this.status = status;
            this.inOctetsDelta = inOctetsDelta;
            this.outOctetsDelta = outOctetsDelta;
            this.inErrorsDelta = inErrorsDelta;
            this.outErrorsDelta = outErrorsDelta;
        }

        public String getInterfaceName() { return interfaceName; }
        public void setInterfaceName(String interfaceName) { this.interfaceName = interfaceName; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public long getInOctetsDelta() { return inOctetsDelta; }
        public void setInOctetsDelta(long inOctetsDelta) { this.inOctetsDelta = inOctetsDelta; }
        public long getOutOctetsDelta() { return outOctetsDelta; }
        public void setOutOctetsDelta(long outOctetsDelta) { this.outOctetsDelta = outOctetsDelta; }
        public long getInErrorsDelta() { return inErrorsDelta; }
        public void setInErrorsDelta(long inErrorsDelta) { this.inErrorsDelta = inErrorsDelta; }
        public long getOutErrorsDelta() { return outErrorsDelta; }
        public void setOutErrorsDelta(long outErrorsDelta) { this.outErrorsDelta = outErrorsDelta; }
    }
}
