package com.cnip.nms.dto;

import java.time.LocalDateTime;

public class AlertDto {
    private Long id;
    private Long deviceId;
    private String deviceName;
    private String deviceIp;
    private String deviceSite;
    private Long ruleId;
    private String ruleName;
    private String severity;
    private String title;
    private String message;
    private String status;
    private LocalDateTime triggeredAt;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;
    private String acknowledgedBy;

    public AlertDto() {}

    public AlertDto(Long id, Long deviceId, String deviceName, String deviceIp, String deviceSite,
                    Long ruleId, String ruleName, String severity, String title, String message,
                    String status, LocalDateTime triggeredAt, LocalDateTime acknowledgedAt,
                    LocalDateTime resolvedAt, String acknowledgedBy) {
        this.id = id;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.deviceIp = deviceIp;
        this.deviceSite = deviceSite;
        this.ruleId = ruleId;
        this.ruleName = ruleName;
        this.severity = severity;
        this.title = title;
        this.message = message;
        this.status = status;
        this.triggeredAt = triggeredAt;
        this.acknowledgedAt = acknowledgedAt;
        this.resolvedAt = resolvedAt;
        this.acknowledgedBy = acknowledgedBy;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public String getDeviceIp() { return deviceIp; }
    public void setDeviceIp(String deviceIp) { this.deviceIp = deviceIp; }
    public String getDeviceSite() { return deviceSite; }
    public void setDeviceSite(String deviceSite) { this.deviceSite = deviceSite; }
    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }
    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(LocalDateTime triggeredAt) { this.triggeredAt = triggeredAt; }
    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Long deviceId;
        private String deviceName;
        private String deviceIp;
        private String deviceSite;
        private Long ruleId;
        private String ruleName;
        private String severity;
        private String title;
        private String message;
        private String status;
        private LocalDateTime triggeredAt;
        private LocalDateTime acknowledgedAt;
        private LocalDateTime resolvedAt;
        private String acknowledgedBy;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder deviceId(Long deviceId) { this.deviceId = deviceId; return this; }
        public Builder deviceName(String deviceName) { this.deviceName = deviceName; return this; }
        public Builder deviceIp(String deviceIp) { this.deviceIp = deviceIp; return this; }
        public Builder deviceSite(String deviceSite) { this.deviceSite = deviceSite; return this; }
        public Builder ruleId(Long ruleId) { this.ruleId = ruleId; return this; }
        public Builder ruleName(String ruleName) { this.ruleName = ruleName; return this; }
        public Builder severity(String severity) { this.severity = severity; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder message(String message) { this.message = message; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder triggeredAt(LocalDateTime triggeredAt) { this.triggeredAt = triggeredAt; return this; }
        public Builder acknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; return this; }
        public Builder resolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; return this; }
        public Builder acknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; return this; }
        public AlertDto build() {
            return new AlertDto(id, deviceId, deviceName, deviceIp, deviceSite, ruleId, ruleName, severity, title, message, status, triggeredAt, acknowledgedAt, resolvedAt, acknowledgedBy);
        }
    }
}
