package com.cnip.nms.dto;

import java.time.LocalDateTime;

public class NotificationSettingDto {
    private Long id;
    private Boolean emailEnabled;
    private String recipientEmails;
    private Boolean webhookEnabled;
    private String webhookUrl;
    private String minSeverity;
    private LocalDateTime updatedAt;

    public NotificationSettingDto() {}

    public NotificationSettingDto(Long id, Boolean emailEnabled, String recipientEmails, Boolean webhookEnabled,
                                  String webhookUrl, String minSeverity, LocalDateTime updatedAt) {
        this.id = id;
        this.emailEnabled = emailEnabled;
        this.recipientEmails = recipientEmails;
        this.webhookEnabled = webhookEnabled;
        this.webhookUrl = webhookUrl;
        this.minSeverity = minSeverity;
        this.updatedAt = updatedAt;
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
        private Boolean emailEnabled;
        private String recipientEmails;
        private Boolean webhookEnabled;
        private String webhookUrl;
        private String minSeverity;
        private LocalDateTime updatedAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder emailEnabled(Boolean emailEnabled) { this.emailEnabled = emailEnabled; return this; }
        public Builder recipientEmails(String recipientEmails) { this.recipientEmails = recipientEmails; return this; }
        public Builder webhookEnabled(Boolean webhookEnabled) { this.webhookEnabled = webhookEnabled; return this; }
        public Builder webhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; return this; }
        public Builder minSeverity(String minSeverity) { this.minSeverity = minSeverity; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public NotificationSettingDto build() {
            return new NotificationSettingDto(id, emailEnabled, recipientEmails, webhookEnabled, webhookUrl, minSeverity, updatedAt);
        }
    }
}
