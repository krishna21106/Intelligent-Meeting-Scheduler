package com.cnip.nms.controller;

import com.cnip.nms.dto.DeviceCreateUpdateDto;
import com.cnip.nms.dto.DeviceDto;
import com.cnip.nms.dto.PageResponse;
import com.cnip.nms.service.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Tag(name = "Device Inventory", description = "Endpoints for managing network devices, CSV import/export")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    @Operation(summary = "Get paginated, filtered list of network devices")
    public ResponseEntity<PageResponse<DeviceDto>> getDevices(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String site,
            @RequestParam(required = false) String deviceType,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDir) {
        return ResponseEntity.ok(deviceService.getDevices(search, site, deviceType, status, page, size, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get detailed device specification and interfaces")
    public ResponseEntity<DeviceDto> getDeviceById(@PathVariable Long id) {
        return ResponseEntity.ok(deviceService.getDeviceById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Register a new network device")
    public ResponseEntity<DeviceDto> createDevice(@Valid @RequestBody DeviceCreateUpdateDto dto) {
        return ResponseEntity.ok(deviceService.createDevice(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Update an existing device configuration")
    public ResponseEntity<DeviceDto> updateDevice(@PathVariable Long id, @Valid @RequestBody DeviceCreateUpdateDto dto) {
        return ResponseEntity.ok(deviceService.updateDevice(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Decommission and remove a device")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Export all devices in CSV format")
    public ResponseEntity<byte[]> exportCsv() {
        String csv = deviceService.exportDevicesCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cnip-devices.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }

    @PostMapping("/import/csv")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Import devices via CSV file")
    public ResponseEntity<Map<String, Object>> importCsv(@RequestParam("file") MultipartFile file) {
        int count = deviceService.importDevicesCsv(file);
        return ResponseEntity.ok(Map.of("message", "Successfully imported devices", "count", count));
    }
}

