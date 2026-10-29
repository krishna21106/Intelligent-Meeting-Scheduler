package com.cnip.nms.controller;

import com.cnip.nms.dto.InterfaceDto;
import com.cnip.nms.dto.IpAddressDto;
import com.cnip.nms.dto.PageResponse;
import com.cnip.nms.dto.VlanDto;
import com.cnip.nms.service.IpamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ipam")
@RequiredArgsConstructor
@Tag(name = "IPAM & VLANs", description = "Endpoints for IP address management, subnets, and VLANs")
public class IpamController {

    private final IpamService ipamService;

    // --- VLANs ---
    @GetMapping("/vlans")
    @Operation(summary = "Get list of all configured VLANs with utilization stats")
    public ResponseEntity<List<VlanDto>> getVlans() {
        return ResponseEntity.ok(ipamService.getAllVlans());
    }

    @PostMapping("/vlans")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new VLAN")
    public ResponseEntity<VlanDto> createVlan(@Valid @RequestBody VlanDto dto) {
        return ResponseEntity.ok(ipamService.createVlan(dto));
    }

    @DeleteMapping("/vlans/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a VLAN")
    public ResponseEntity<Void> deleteVlan(@PathVariable Long id) {
        ipamService.deleteVlan(id);
        return ResponseEntity.noContent().build();
    }

    // --- IP Addresses ---
    @GetMapping("/ips")
    @Operation(summary = "Get paginated, filtered list of IP addresses")
    public ResponseEntity<PageResponse<IpAddressDto>> getIpAddresses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String subnet,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ipamService.getIpAddresses(search, status, subnet, page, size));
    }

    @PostMapping("/ips")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Allocate or reserve an IP address")
    public ResponseEntity<IpAddressDto> allocateIp(@Valid @RequestBody IpAddressDto dto) {
        return ResponseEntity.ok(ipamService.allocateIp(dto));
    }

    @DeleteMapping("/ips/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Release an allocated IP address")
    public ResponseEntity<Void> releaseIp(@PathVariable Long id) {
        ipamService.releaseIp(id);
        return ResponseEntity.noContent().build();
    }

    // --- Device Interfaces ---
    @GetMapping("/devices/{deviceId}/interfaces")
    @Operation(summary = "Get all interfaces for a specific device")
    public ResponseEntity<List<InterfaceDto>> getDeviceInterfaces(@PathVariable Long deviceId) {
        return ResponseEntity.ok(ipamService.getDeviceInterfaces(deviceId));
    }
}

