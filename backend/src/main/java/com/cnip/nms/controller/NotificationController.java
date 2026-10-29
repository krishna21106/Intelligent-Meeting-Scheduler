package com.cnip.nms.controller;

import com.cnip.nms.dto.NotificationSettingDto;
import com.cnip.nms.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification Settings", description = "Endpoints for configuring outbound webhooks and email alert destinations")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get current webhook and email notification settings")
    public ResponseEntity<NotificationSettingDto> getSettings() {
        return ResponseEntity.ok(notificationService.getSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update webhook and email notification preferences")
    public ResponseEntity<NotificationSettingDto> updateSettings(@Valid @RequestBody NotificationSettingDto dto) {
        return ResponseEntity.ok(notificationService.updateSettings(dto));
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Send test notification probe to configured channels")
    public ResponseEntity<Map<String, Object>> testNotification() {
        boolean success = notificationService.testNotification();
        return ResponseEntity.ok(Map.of("success", success, "message", "Test notification triggered successfully"));
    }
}

