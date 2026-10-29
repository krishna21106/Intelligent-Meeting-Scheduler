package com.cnip.nms.controller;

import com.cnip.nms.dto.ConfigBackupDto;
import com.cnip.nms.dto.ConfigDiffDto;
import com.cnip.nms.service.ConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/configs")
@RequiredArgsConstructor
@Tag(name = "Configuration Management", description = "Endpoints for config backups, version history and diff comparison")
public class ConfigController {

    private final ConfigService configService;

    @GetMapping("/devices/{deviceId}")
    @Operation(summary = "Get list of all configuration backups for a device")
    public ResponseEntity<List<ConfigBackupDto>> getDeviceBackups(@PathVariable Long deviceId) {
        return ResponseEntity.ok(configService.getDeviceBackups(deviceId));
    }

    @GetMapping("/devices/{deviceId}/version/{version}")
    @Operation(summary = "Get a specific configuration backup version")
    public ResponseEntity<ConfigBackupDto> getBackupByVersion(@PathVariable Long deviceId, @PathVariable Integer version) {
        return ResponseEntity.ok(configService.getBackupByVersion(deviceId, version));
    }

    @PostMapping("/devices/{deviceId}/backup")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN')")
    @Operation(summary = "Trigger a new configuration backup snapshot")
    public ResponseEntity<ConfigBackupDto> triggerBackup(
            @PathVariable Long deviceId,
            @RequestParam(defaultValue = "RUNNING") String type) {
        return ResponseEntity.ok(configService.triggerBackup(deviceId, type));
    }

    @GetMapping("/devices/{deviceId}/diff")
    @Operation(summary = "Compare differences between two configuration versions")
    public ResponseEntity<ConfigDiffDto> compareVersions(
            @PathVariable Long deviceId,
            @RequestParam Integer versionA,
            @RequestParam Integer versionB) {
        return ResponseEntity.ok(configService.compareVersions(deviceId, versionA, versionB));
    }
}

