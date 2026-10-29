package com.cnip.nms.dto;

import java.util.List;

public class ReportSummaryDto {
    private String period;
    private double overallSlaPercentage;
    private long totalOutages;
    private long totalDowntimeMinutes;
    private double averageLatencyMs;
    private double averageCpuUsage;
    private double averageMemoryUsage;
    private List<SiteSlaDto> siteSlas;
    private List<DeviceSlaDto> topUnreliableDevices;

    public ReportSummaryDto() {}

    public ReportSummaryDto(String period, double overallSlaPercentage, long totalOutages, long totalDowntimeMinutes,
                            double averageLatencyMs, double averageCpuUsage, double averageMemoryUsage,
                            List<SiteSlaDto> siteSlas, List<DeviceSlaDto> topUnreliableDevices) {
        this.period = period;
        this.overallSlaPercentage = overallSlaPercentage;
        this.totalOutages = totalOutages;
        this.totalDowntimeMinutes = totalDowntimeMinutes;
        this.averageLatencyMs = averageLatencyMs;
        this.averageCpuUsage = averageCpuUsage;
        this.averageMemoryUsage = averageMemoryUsage;
        this.siteSlas = siteSlas;
        this.topUnreliableDevices = topUnreliableDevices;
    }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public double getOverallSlaPercentage() { return overallSlaPercentage; }
    public void setOverallSlaPercentage(double overallSlaPercentage) { this.overallSlaPercentage = overallSlaPercentage; }
    public long getTotalOutages() { return totalOutages; }
    public void setTotalOutages(long totalOutages) { this.totalOutages = totalOutages; }
    public long getTotalDowntimeMinutes() { return totalDowntimeMinutes; }
    public void setTotalDowntimeMinutes(long totalDowntimeMinutes) { this.totalDowntimeMinutes = totalDowntimeMinutes; }
    public double getAverageLatencyMs() { return averageLatencyMs; }
    public void setAverageLatencyMs(double averageLatencyMs) { this.averageLatencyMs = averageLatencyMs; }
    public double getAverageCpuUsage() { return averageCpuUsage; }
    public void setAverageCpuUsage(double averageCpuUsage) { this.averageCpuUsage = averageCpuUsage; }
    public double getAverageMemoryUsage() { return averageMemoryUsage; }
    public void setAverageMemoryUsage(double averageMemoryUsage) { this.averageMemoryUsage = averageMemoryUsage; }
    public List<SiteSlaDto> getSiteSlas() { return siteSlas; }
    public void setSiteSlas(List<SiteSlaDto> siteSlas) { this.siteSlas = siteSlas; }
    public List<DeviceSlaDto> getTopUnreliableDevices() { return topUnreliableDevices; }
    public void setTopUnreliableDevices(List<DeviceSlaDto> topUnreliableDevices) { this.topUnreliableDevices = topUnreliableDevices; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String period;
        private double overallSlaPercentage;
        private long totalOutages;
        private long totalDowntimeMinutes;
        private double averageLatencyMs;
        private double averageCpuUsage;
        private double averageMemoryUsage;
        private List<SiteSlaDto> siteSlas;
        private List<DeviceSlaDto> topUnreliableDevices;

        public Builder period(String period) { this.period = period; return this; }
        public Builder overallSlaPercentage(double overallSlaPercentage) { this.overallSlaPercentage = overallSlaPercentage; return this; }
        public Builder totalOutages(long totalOutages) { this.totalOutages = totalOutages; return this; }
        public Builder totalDowntimeMinutes(long totalDowntimeMinutes) { this.totalDowntimeMinutes = totalDowntimeMinutes; return this; }
        public Builder averageLatencyMs(double averageLatencyMs) { this.averageLatencyMs = averageLatencyMs; return this; }
        public Builder averageCpuUsage(double averageCpuUsage) { this.averageCpuUsage = averageCpuUsage; return this; }
        public Builder averageMemoryUsage(double averageMemoryUsage) { this.averageMemoryUsage = averageMemoryUsage; return this; }
        public Builder siteSlas(List<SiteSlaDto> siteSlas) { this.siteSlas = siteSlas; return this; }
        public Builder topUnreliableDevices(List<DeviceSlaDto> topUnreliableDevices) { this.topUnreliableDevices = topUnreliableDevices; return this; }
        public ReportSummaryDto build() {
            return new ReportSummaryDto(period, overallSlaPercentage, totalOutages, totalDowntimeMinutes, averageLatencyMs, averageCpuUsage, averageMemoryUsage, siteSlas, topUnreliableDevices);
        }
    }

    public static class SiteSlaDto {
        private String site;
        private double slaPercentage;
        private int totalDevices;
        private int degradedCount;

        public SiteSlaDto() {}

        public SiteSlaDto(String site, double slaPercentage, int totalDevices, int degradedCount) {
            this.site = site;
            this.slaPercentage = slaPercentage;
            this.totalDevices = totalDevices;
            this.degradedCount = degradedCount;
        }

        public String getSite() { return site; }
        public void setSite(String site) { this.site = site; }
        public double getSlaPercentage() { return slaPercentage; }
        public void setSlaPercentage(double slaPercentage) { this.slaPercentage = slaPercentage; }
        public int getTotalDevices() { return totalDevices; }
        public void setTotalDevices(int totalDevices) { this.totalDevices = totalDevices; }
        public int getDegradedCount() { return degradedCount; }
        public void setDegradedCount(int degradedCount) { this.degradedCount = degradedCount; }
    }

    public static class DeviceSlaDto {
        private String deviceName;
        private String ipAddress;
        private String site;
        private double uptimePercentage;
        private long downtimeMinutes;
        private int incidentCount;

        public DeviceSlaDto() {}

        public DeviceSlaDto(String deviceName, String ipAddress, String site, double uptimePercentage, long downtimeMinutes, int incidentCount) {
            this.deviceName = deviceName;
            this.ipAddress = ipAddress;
            this.site = site;
            this.uptimePercentage = uptimePercentage;
            this.downtimeMinutes = downtimeMinutes;
            this.incidentCount = incidentCount;
        }

        public String getDeviceName() { return deviceName; }
        public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
        public String getIpAddress() { return ipAddress; }
        public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
        public String getSite() { return site; }
        public void setSite(String site) { this.site = site; }
        public double getUptimePercentage() { return uptimePercentage; }
        public void setUptimePercentage(double uptimePercentage) { this.uptimePercentage = uptimePercentage; }
        public long getDowntimeMinutes() { return downtimeMinutes; }
        public void setDowntimeMinutes(long downtimeMinutes) { this.downtimeMinutes = downtimeMinutes; }
        public int getIncidentCount() { return incidentCount; }
        public void setIncidentCount(int incidentCount) { this.incidentCount = incidentCount; }
    }
}
