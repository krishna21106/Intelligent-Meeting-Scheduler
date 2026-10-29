package com.cnip.nms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_settings")
public class NotificationSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Boolean emailEnabled = false;

    @Column(length = 500)
    private String recipientEmails;

    private Boolean webhookEnabled = false;

    @Column(length = 500)
    private String webhookUrl;

    @Column(nullable = false, length = 20)
    private String minSeverity = "WARNING";

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public NotificationSetting() {}

    public NotificationSetting(Long id, Boolean emailEnabled, String recipientEmails, Boolean webhookEnabled,
                               String webhookUrl, String minSeverity, LocalDateTime updatedAt) {
        this.id = id;
        this.emailEnabled = emailEnabled != null ? emailEnabled : false;
        this.recipientEmails = recipientEmails;
        this.webhookEnabled = webhookEnabled != null ? webhookEnabled : false;
        this.webhookUrl = webhookUrl;
        this.minSeverity = minSeverity != null ? minSeverity : "WARNING";
        this.updatedAt = updatedAt;
    }

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Boolean getEmailEnabled() { return emailEnabled; }
    public void setEmailEnabled(Boolean emailEnabled) { this.emailEnabled = emailEnabled; }
    public String getRecipientEmails() { return recipientEmails; }
    public void setRecipientEmails(String recipientEmails) { this.recipientEmails = recipientEmails; }
    public Boolean getWebhookEnabled() { return webhookEnabled; }
    public void setWebhookEnabled(Boolean webhookEnabled) { this.webhookEnabled = webhookEnabled; }
    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }
    public String getMinSeverity() { return minSeverity; }
    public void setMinSeverity(String minSeverity) { this.minSeverity = minSeverity; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Boolean emailEnabled = false;
        private String recipientEmails;
        private Boolean webhookEnabled = false;
        private String webhookUrl;
        private String minSeverity = "WARNING";
        private LocalDateTime updatedAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder emailEnabled(Boolean emailEnabled) { this.emailEnabled = emailEnabled; return this; }
        public Builder recipientEmails(String recipientEmails) { this.recipientEmails = recipientEmails; return this; }
        public Builder webhookEnabled(Boolean webhookEnabled) { this.webhookEnabled = webhookEnabled; return this; }
        public Builder webhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; return this; }
        public Builder minSeverity(String minSeverity) { this.minSeverity = minSeverity; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public NotificationSetting build() {
            return new NotificationSetting(id, emailEnabled, recipientEmails, webhookEnabled, webhookUrl, minSeverity, updatedAt);
        }
    }
}
