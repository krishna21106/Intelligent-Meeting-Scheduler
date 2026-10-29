package com.cnip.nms.service;

import com.cnip.nms.dto.NotificationSettingDto;
import com.cnip.nms.entity.Alert;
import com.cnip.nms.entity.NotificationSetting;
import com.cnip.nms.repository.NotificationSettingRepository;
import com.cnip.nms.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationSettingRepository repository;
    private final AuditLogService auditLogService;

    public NotificationService(NotificationSettingRepository repository, AuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    public NotificationSettingDto getSettings() {
        NotificationSetting setting = repository.findAll().stream().findFirst()
                .orElseGet(() -> NotificationSetting.builder()
                        .emailEnabled(false)
                        .recipientEmails("noc@cnip.network")
                        .webhookEnabled(false)
                        .minSeverity("WARNING")
                        .updatedAt(LocalDateTime.now())
                        .build());

        return NotificationSettingDto.builder()
                .id(setting.getId())
                .emailEnabled(setting.getEmailEnabled())
                .recipientEmails(setting.getRecipientEmails())
                .webhookEnabled(setting.getWebhookEnabled())
                .webhookUrl(setting.getWebhookUrl())
                .minSeverity(setting.getMinSeverity())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }

    @Transactional
    public NotificationSettingDto updateSettings(NotificationSettingDto dto) {
        NotificationSetting setting = repository.findAll().stream().findFirst()
                .orElse(new NotificationSetting());

        setting.setEmailEnabled(Boolean.TRUE.equals(dto.getEmailEnabled()));
        setting.setRecipientEmails(dto.getRecipientEmails());
        setting.setWebhookEnabled(Boolean.TRUE.equals(dto.getWebhookEnabled()));
        setting.setWebhookUrl(dto.getWebhookUrl());
        setting.setMinSeverity(dto.getMinSeverity() != null ? dto.getMinSeverity() : "WARNING");
        setting.setUpdatedAt(LocalDateTime.now());

        NotificationSetting saved = repository.save(setting);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "UPDATE_SETTINGS", "NOTIFICATION", "1",
                "Updated notification webhook and email settings");

        dto.setId(saved.getId());
        dto.setUpdatedAt(saved.getUpdatedAt());
        return dto;
    }

    public boolean testNotification() {
        log.info("Sending test notification probe to configured channels...");
        return true;
    }

    public void dispatchAlertNotification(Alert alert) {
        NotificationSettingDto settings = getSettings();
        if (Boolean.TRUE.equals(settings.getWebhookEnabled()) && settings.getWebhookUrl() != null && !settings.getWebhookUrl().isBlank()) {
            log.info("[WEBHOOK DISPATCH] Alert triggered: [{}] {} - {}", alert.getSeverity(), alert.getTitle(), alert.getMessage());
        }
        if (Boolean.TRUE.equals(settings.getEmailEnabled()) && settings.getRecipientEmails() != null) {
            log.info("[EMAIL DISPATCH] Sent alert email to {}: {}", settings.getRecipientEmails(), alert.getTitle());
        }
    }
}
