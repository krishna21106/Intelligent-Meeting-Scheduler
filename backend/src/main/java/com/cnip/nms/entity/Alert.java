package com.cnip.nms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
public class Alert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    private AlertRule rule;

    @Column(nullable = false, length = 20)
    private String severity;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(nullable = false)
    private LocalDateTime triggeredAt;

    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;

    @Column(length = 100)
    private String acknowledgedBy;

    public Alert() {}

    public Alert(Long id, Device device, AlertRule rule, String severity, String title, String message,
                 String status, LocalDateTime triggeredAt, LocalDateTime acknowledgedAt,
                 LocalDateTime resolvedAt, String acknowledgedBy) {
        this.id = id;
        this.device = device;
        this.rule = rule;
        this.severity = severity;
        this.title = title;
        this.message = message;
        this.status = status != null ? status : "ACTIVE";
        this.triggeredAt = triggeredAt;
        this.acknowledgedAt = acknowledgedAt;
        this.resolvedAt = resolvedAt;
        this.acknowledgedBy = acknowledgedBy;
    }

    @PrePersist
    protected void onTrigger() {
        if (triggeredAt == null) {
            triggeredAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }
    public AlertRule getRule() { return rule; }
    public void setRule(AlertRule rule) { this.rule = rule; }
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
        private Device device;
        private AlertRule rule;
        private String severity;
        private String title;
        private String message;
        private String status = "ACTIVE";
        private LocalDateTime triggeredAt;
        private LocalDateTime acknowledgedAt;
        private LocalDateTime resolvedAt;
        private String acknowledgedBy;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder device(Device device) { this.device = device; return this; }
        public Builder rule(AlertRule rule) { this.rule = rule; return this; }
        public Builder severity(String severity) { this.severity = severity; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder message(String message) { this.message = message; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder triggeredAt(LocalDateTime triggeredAt) { this.triggeredAt = triggeredAt; return this; }
        public Builder acknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; return this; }
        public Builder resolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; return this; }
        public Builder acknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; return this; }
        public Alert build() {
            return new Alert(id, device, rule, severity, title, message, status, triggeredAt, acknowledgedAt, resolvedAt, acknowledgedBy);
        }
    }
}
