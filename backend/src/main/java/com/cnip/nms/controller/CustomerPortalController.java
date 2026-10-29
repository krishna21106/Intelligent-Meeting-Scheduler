package com.cnip.nms.controller;

import com.cnip.nms.dto.AlertDto;
import com.cnip.nms.dto.CustomerDeviceDto;
import com.cnip.nms.dto.PageResponse;
import com.cnip.nms.service.CustomerPortalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer")
@Tag(name = "Customer Portal", description = "Customer-owned device and alert views")
public class CustomerPortalController {
    private final CustomerPortalService customerPortalService;

    public CustomerPortalController(CustomerPortalService customerPortalService) {
        this.customerPortalService = customerPortalService;
    }

    @GetMapping("/devices")
    @Operation(summary = "List devices assigned to the authenticated customer")
    public ResponseEntity<PageResponse<CustomerDeviceDto>> getDevices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(customerPortalService.getDevices(page, size));
    }

    @GetMapping("/alerts")
    @Operation(summary = "List alerts for devices assigned to the authenticated customer")
    public ResponseEntity<PageResponse<AlertDto>> getAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(customerPortalService.getAlerts(page, size));
    }
}
