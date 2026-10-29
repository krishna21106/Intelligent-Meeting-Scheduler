package com.cnip.nms.controller;

import com.cnip.nms.entity.Device;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.service.AuditLogService;
import com.cnip.nms.service.MonitoringService;
import com.cnip.nms.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/simulator")
@RequiredArgsConstructor
@Tag(name = "Network Simulator", description = "Endpoints for controlling the built-in telemetry simulator and failure injection")
public class SimulatorController {

    private final DeviceRepository deviceRepository;
    private final MonitoringService monitoringService;
    private final AuditLogService auditLogService;

    @Value("${nms.simulator.enabled:true}")
    private boolean simulatorEnabled;

    @Value("${nms.simulator.polling-interval-ms:10000}")
    private int pollingIntervalMs;

    @GetMapping("/status")
    @Operation(summary = "Get current simulator engine status and parameters")
    public ResponseEntity<Map<String, Object>> getSimulatorStatus() {
        return ResponseEntity.ok(Map.of(
                "enabled", simulatorEnabled,
                "pollingIntervalMs", pollingIntervalMs,
                "simulatedDeviceCount", deviceRepository.count(),
                "mode", "Diurnal Curve with Jitter & Flap Injection"
        ));
    }

    @PostMapping("/poll-now")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN')")
    @Operation(summary = "Manually trigger immediate polling cycle for all devices")
    public ResponseEntity<Map<String, String>> triggerPollNow() {
        monitoringService.scheduleDevicePolling();
        return ResponseEntity.ok(Map.of("message", "Triggered immediate polling cycle across all devices"));
    }

    @PostMapping("/inject-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Inject simulated status failure/recovery on a device (e.g. DOWN, WARNING, UP)")
    public ResponseEntity<Map<String, Object>> injectDeviceStatus(
            @RequestParam Long deviceId,
            @RequestParam String status) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        device.setStatus(status.toUpperCase());
        deviceRepository.save(device);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "SIMULATOR_INJECT", "DEVICE", String.valueOf(deviceId),
                "Simulated status change to " + status.toUpperCase() + " on " + device.getName());

        return ResponseEntity.ok(Map.of(
                "deviceId", device.getId(),
                "deviceName", device.getName(),
                "newStatus", device.getStatus()
        ));
    }
}

