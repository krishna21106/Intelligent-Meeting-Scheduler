package com.cnip.nms.controller;

import com.cnip.nms.dto.*;
import com.cnip.nms.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts & Incidents", description = "Endpoints for alert management and threshold rule configuration")
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    @Operation(summary = "Get paginated, filtered list of alerts")
    public ResponseEntity<PageResponse<AlertDto>> getAlerts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) Long deviceId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ResponseEntity.ok(alertService.getAlerts(status, severity, deviceId, search, page, size));
    }

    @PostMapping("/action")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN')")
    @Operation(summary = "Acknowledge or resolve one or more alerts")
    public ResponseEntity<Map<String, String>> handleAlertAction(@Valid @RequestBody AlertActionDto actionDto) {
        alertService.handleAlertAction(actionDto);
        return ResponseEntity.ok(Map.of("message", "Alerts processed successfully"));
    }

    @GetMapping("/rules")
    @Operation(summary = "Get all configured threshold alert rules")
    public ResponseEntity<List<AlertRuleDto>> getAllRules() {
        return ResponseEntity.ok(alertService.getAllRules());
    }

    @PutMapping("/rules/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update threshold alert rule parameters")
    public ResponseEntity<AlertRuleDto> updateRule(@PathVariable Long id, @Valid @RequestBody AlertRuleDto dto) {
        return ResponseEntity.ok(alertService.updateRule(id, dto));
    }
}

