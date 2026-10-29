package com.cnip.nms.controller;

import com.cnip.nms.dto.MetricDto;
import com.cnip.nms.service.MonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
@Tag(name = "Monitoring & Telemetry", description = "Endpoints for device time-series metrics")
public class MonitoringController {

    private final MonitoringService monitoringService;

    @GetMapping("/devices/{deviceId}/metrics")
    @Operation(summary = "Get historical metrics for a specific device")
    public ResponseEntity<List<MetricDto>> getDeviceMetrics(
            @PathVariable Long deviceId,
            @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(monitoringService.getDeviceMetrics(deviceId, hours));
    }
}

