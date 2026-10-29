package com.cnip.nms.dto;

import java.util.List;
import java.util.Map;

public class DashboardSummaryDto {
    private long totalDevices;
    private long upDevices;
    private long downDevices;
    private long warningDevices;
    private long maintenanceDevices;
    private double networkHealthScore;

    private long activeAlertsCount;
    private long criticalAlertsCount;
    private long warningAlertsCount;

    private Map<String, Long> devicesBySite;
    private Map<String, Long> devicesByType;

    private List<TrafficPointDto> liveTraffic;
    private List<InterfaceDto> topBusiestInterfaces;
    private List<AlertDto> recentAlerts;
    private List<DeviceDto> devicesNeedingAttention;

    public DashboardSummaryDto() {}

    public DashboardSummaryDto(long totalDevices, long upDevices, long downDevices, long warningDevices,
                               long maintenanceDevices, double networkHealthScore, long activeAlertsCount,
                               long criticalAlertsCount, long warningAlertsCount, Map<String, Long> devicesBySite,
                               Map<String, Long> devicesByType, List<TrafficPointDto> liveTraffic,
                               List<InterfaceDto> topBusiestInterfaces, List<AlertDto> recentAlerts,
                               List<DeviceDto> devicesNeedingAttention) {
        this.totalDevices = totalDevices;
        this.upDevices = upDevices;
        this.downDevices = downDevices;
        this.warningDevices = warningDevices;
        this.maintenanceDevices = maintenanceDevices;
        this.networkHealthScore = networkHealthScore;
        this.activeAlertsCount = activeAlertsCount;
        this.criticalAlertsCount = criticalAlertsCount;
        this.warningAlertsCount = warningAlertsCount;
        this.devicesBySite = devicesBySite;
        this.devicesByType = devicesByType;
        this.liveTraffic = liveTraffic;
        this.topBusiestInterfaces = topBusiestInterfaces;
        this.recentAlerts = recentAlerts;
        this.devicesNeedingAttention = devicesNeedingAttention;
    }

    public long getTotalDevices() { return totalDevices; }
    public void setTotalDevices(long totalDevices) { this.totalDevices = totalDevices; }
    public long getUpDevices() { return upDevices; }
    public void setUpDevices(long upDevices) { this.upDevices = upDevices; }
    public long getDownDevices() { return downDevices; }
    public void setDownDevices(long downDevices) { this.downDevices = downDevices; }
    public long getWarningDevices() { return warningDevices; }
    public void setWarningDevices(long warningDevices) { this.warningDevices = warningDevices; }
    public long getMaintenanceDevices() { return maintenanceDevices; }
    public void setMaintenanceDevices(long maintenanceDevices) { this.maintenanceDevices = maintenanceDevices; }
    public double getNetworkHealthScore() { return networkHealthScore; }
    public void setNetworkHealthScore(double networkHealthScore) { this.networkHealthScore = networkHealthScore; }
    public long getActiveAlertsCount() { return activeAlertsCount; }
    public void setActiveAlertsCount(long activeAlertsCount) { this.activeAlertsCount = activeAlertsCount; }
    public long getCriticalAlertsCount() { return criticalAlertsCount; }
    public void setCriticalAlertsCount(long criticalAlertsCount) { this.criticalAlertsCount = criticalAlertsCount; }
    public long getWarningAlertsCount() { return warningAlertsCount; }
    public void setWarningAlertsCount(long warningAlertsCount) { this.warningAlertsCount = warningAlertsCount; }
    public Map<String, Long> getDevicesBySite() { return devicesBySite; }
    public void setDevicesBySite(Map<String, Long> devicesBySite) { this.devicesBySite = devicesBySite; }
    public Map<String, Long> getDevicesByType() { return devicesByType; }
    public void setDevicesByType(Map<String, Long> devicesByType) { this.devicesByType = devicesByType; }
    public List<TrafficPointDto> getLiveTraffic() { return liveTraffic; }
    public void setLiveTraffic(List<TrafficPointDto> liveTraffic) { this.liveTraffic = liveTraffic; }
    public List<InterfaceDto> getTopBusiestInterfaces() { return topBusiestInterfaces; }
    public void setTopBusiestInterfaces(List<InterfaceDto> topBusiestInterfaces) { this.topBusiestInterfaces = topBusiestInterfaces; }
    public List<AlertDto> getRecentAlerts() { return recentAlerts; }
    public void setRecentAlerts(List<AlertDto> recentAlerts) { this.recentAlerts = recentAlerts; }
    public List<DeviceDto> getDevicesNeedingAttention() { return devicesNeedingAttention; }
    public void setDevicesNeedingAttention(List<DeviceDto> devicesNeedingAttention) { this.devicesNeedingAttention = devicesNeedingAttention; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private long totalDevices;
        private long upDevices;
        private long downDevices;
        private long warningDevices;
        private long maintenanceDevices;
        private double networkHealthScore;
        private long activeAlertsCount;
        private long criticalAlertsCount;
        private long warningAlertsCount;
        private Map<String, Long> devicesBySite;
        private Map<String, Long> devicesByType;
        private List<TrafficPointDto> liveTraffic;
        private List<InterfaceDto> topBusiestInterfaces;
        private List<AlertDto> recentAlerts;
        private List<DeviceDto> devicesNeedingAttention;

        public Builder totalDevices(long totalDevices) { this.totalDevices = totalDevices; return this; }
        public Builder upDevices(long upDevices) { this.upDevices = upDevices; return this; }
        public Builder downDevices(long downDevices) { this.downDevices = downDevices; return this; }
        public Builder warningDevices(long warningDevices) { this.warningDevices = warningDevices; return this; }
        public Builder maintenanceDevices(long maintenanceDevices) { this.maintenanceDevices = maintenanceDevices; return this; }
        public Builder networkHealthScore(double networkHealthScore) { this.networkHealthScore = networkHealthScore; return this; }
        public Builder activeAlertsCount(long activeAlertsCount) { this.activeAlertsCount = activeAlertsCount; return this; }
        public Builder criticalAlertsCount(long criticalAlertsCount) { this.criticalAlertsCount = criticalAlertsCount; return this; }
        public Builder warningAlertsCount(long warningAlertsCount) { this.warningAlertsCount = warningAlertsCount; return this; }
        public Builder devicesBySite(Map<String, Long> devicesBySite) { this.devicesBySite = devicesBySite; return this; }
        public Builder devicesByType(Map<String, Long> devicesByType) { this.devicesByType = devicesByType; return this; }
        public Builder liveTraffic(List<TrafficPointDto> liveTraffic) { this.liveTraffic = liveTraffic; return this; }
        public Builder topBusiestInterfaces(List<InterfaceDto> topBusiestInterfaces) { this.topBusiestInterfaces = topBusiestInterfaces; return this; }
        public Builder recentAlerts(List<AlertDto> recentAlerts) { this.recentAlerts = recentAlerts; return this; }
        public Builder devicesNeedingAttention(List<DeviceDto> devicesNeedingAttention) { this.devicesNeedingAttention = devicesNeedingAttention; return this; }
        public DashboardSummaryDto build() {
            return new DashboardSummaryDto(totalDevices, upDevices, downDevices, warningDevices, maintenanceDevices, networkHealthScore, activeAlertsCount, criticalAlertsCount, warningAlertsCount, devicesBySite, devicesByType, liveTraffic, topBusiestInterfaces, recentAlerts, devicesNeedingAttention);
        }
    }

    public static class TrafficPointDto {
        private String timestamp;
        private double inboundGbps;
        private double outboundGbps;

        public TrafficPointDto() {}

        public TrafficPointDto(String timestamp, double inboundGbps, double outboundGbps) {
            this.timestamp = timestamp;
            this.inboundGbps = inboundGbps;
            this.outboundGbps = outboundGbps;
        }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
        public double getInboundGbps() { return inboundGbps; }
        public void setInboundGbps(double inboundGbps) { this.inboundGbps = inboundGbps; }
        public double getOutboundGbps() { return outboundGbps; }
        public void setOutboundGbps(double outboundGbps) { this.outboundGbps = outboundGbps; }
    }
}
