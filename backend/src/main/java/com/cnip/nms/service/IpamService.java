package com.cnip.nms.service;

import com.cnip.nms.dto.*;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.InterfaceEntity;
import com.cnip.nms.entity.IpAddress;
import com.cnip.nms.entity.Vlan;
import com.cnip.nms.exception.BadRequestException;
import com.cnip.nms.exception.ResourceNotFoundException;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.InterfaceRepository;
import com.cnip.nms.repository.IpAddressRepository;
import com.cnip.nms.repository.VlanRepository;
import com.cnip.nms.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class IpamService {

    private final VlanRepository vlanRepository;
    private final IpAddressRepository ipAddressRepository;
    private final DeviceRepository deviceRepository;
    private final InterfaceRepository interfaceRepository;
    private final AuditLogService auditLogService;

    public IpamService(
            VlanRepository vlanRepository,
            IpAddressRepository ipAddressRepository,
            DeviceRepository deviceRepository,
            InterfaceRepository interfaceRepository,
            AuditLogService auditLogService) {
        this.vlanRepository = vlanRepository;
        this.ipAddressRepository = ipAddressRepository;
        this.deviceRepository = deviceRepository;
        this.interfaceRepository = interfaceRepository;
        this.auditLogService = auditLogService;
    }

    // --- VLAN Management ---
    public List<VlanDto> getAllVlans() {
        return vlanRepository.findAll(Sort.by(Sort.Direction.ASC, "vlanId")).stream()
                .map(v -> {
                    List<IpAddress> ips = ipAddressRepository.findAll().stream()
                            .filter(ip -> ip.getVlan() != null && ip.getVlan().getId().equals(v.getId()))
                            .toList();
                    int allocated = (int) ips.stream().filter(ip -> "ALLOCATED".equalsIgnoreCase(ip.getStatus())).count();
                    return VlanDto.builder()
                            .id(v.getId())
                            .vlanId(v.getVlanId())
                            .name(v.getName())
                            .subnet(v.getSubnet())
                            .description(v.getDescription())
                            .allocatedIpCount(allocated)
                            .totalIpCapacity(254)
                            .build();
                }).collect(Collectors.toList());
    }

    @Transactional
    public VlanDto createVlan(VlanDto dto) {
        if (vlanRepository.existsByVlanId(dto.getVlanId())) {
            throw new BadRequestException("VLAN ID " + dto.getVlanId() + " already exists");
        }

        Vlan vlan = Vlan.builder()
                .vlanId(dto.getVlanId())
                .name(dto.getName())
                .subnet(dto.getSubnet())
                .description(dto.getDescription())
                .build();
        Vlan saved = vlanRepository.save(vlan);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "CREATE_VLAN", "VLAN", String.valueOf(saved.getId()),
                "Created VLAN " + saved.getVlanId() + " (" + saved.getName() + ")");

        dto.setId(saved.getId());
        return dto;
    }

    @Transactional
    public void deleteVlan(Long id) {
        Vlan vlan = vlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("VLAN not found: " + id));
        vlanRepository.delete(vlan);
        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "DELETE_VLAN", "VLAN", String.valueOf(id),
                "Deleted VLAN " + vlan.getVlanId());
    }

    // --- IP Address Management ---
    public PageResponse<IpAddressDto> getIpAddresses(String search, String status, String subnet, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"));

        Specification<IpAddress> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            if (subnet != null && !subnet.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("subnet"), subnet));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                var searchPred = cb.or(
                        cb.like(cb.lower(root.get("ipAddress")), pattern),
                        cb.like(cb.lower(root.get("dnsName")), pattern)
                );
                predicates = cb.and(predicates, searchPred);
            }
            return predicates;
        };

        Page<IpAddress> ipPage = ipAddressRepository.findAll(spec, pageable);
        List<IpAddressDto> dtos = ipPage.getContent().stream().map(ip -> IpAddressDto.builder()
                .id(ip.getId())
                .ipAddress(ip.getIpAddress())
                .subnet(ip.getSubnet())
                .status(ip.getStatus())
                .deviceId(ip.getDevice() != null ? ip.getDevice().getId() : null)
                .deviceName(ip.getDevice() != null ? ip.getDevice().getName() : null)
                .vlanId(ip.getVlan() != null ? ip.getVlan().getId() : null)
                .vlanNumber(ip.getVlan() != null ? ip.getVlan().getVlanId() : null)
                .vlanName(ip.getVlan() != null ? ip.getVlan().getName() : null)
                .dnsName(ip.getDnsName())
                .build()).collect(Collectors.toList());

        return PageResponse.<IpAddressDto>builder()
                .content(dtos)
                .pageNumber(ipPage.getNumber())
                .pageSize(ipPage.getSize())
                .totalElements(ipPage.getTotalElements())
                .totalPages(ipPage.getTotalPages())
                .last(ipPage.isLast())
                .build();
    }

    @Transactional
    public IpAddressDto allocateIp(IpAddressDto dto) {
        if (ipAddressRepository.existsByIpAddress(dto.getIpAddress())) {
            throw new BadRequestException("IP address " + dto.getIpAddress() + " already exists");
        }

        Device device = null;
        if (dto.getDeviceId() != null) {
            device = deviceRepository.findById(dto.getDeviceId()).orElse(null);
        }

        Vlan vlan = null;
        if (dto.getVlanId() != null) {
            vlan = vlanRepository.findById(dto.getVlanId()).orElse(null);
        }

        IpAddress ip = IpAddress.builder()
                .ipAddress(dto.getIpAddress())
                .subnet(dto.getSubnet())
                .status(dto.getStatus() != null ? dto.getStatus() : "ALLOCATED")
                .device(device)
                .vlan(vlan)
                .dnsName(dto.getDnsName())
                .build();

        IpAddress saved = ipAddressRepository.save(ip);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "ALLOCATE_IP", "IPAM", String.valueOf(saved.getId()),
                "Allocated IP " + saved.getIpAddress() + (device != null ? " to " + device.getName() : ""));

        dto.setId(saved.getId());
        return dto;
    }

    @Transactional
    public void releaseIp(Long id) {
        IpAddress ip = ipAddressRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IP not found: " + id));
        ip.setStatus("AVAILABLE");
        ip.setDevice(null);
        ipAddressRepository.save(ip);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "RELEASE_IP", "IPAM", String.valueOf(id),
                "Released IP " + ip.getIpAddress());
    }

    // --- Interface Management ---
    public List<InterfaceDto> getDeviceInterfaces(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));

        return interfaceRepository.findByDeviceId(deviceId).stream().map(i -> InterfaceDto.builder()
                .id(i.getId())
                .deviceId(device.getId())
                .deviceName(device.getName())
                .name(i.getName())
                .macAddress(i.getMacAddress())
                .ipAddress(i.getIpAddress())
                .status(i.getStatus())
                .speedBps(i.getSpeedBps())
                .inOctets(i.getInOctets())
                .outOctets(i.getOutOctets())
                .inErrors(i.getInErrors())
                .outErrors(i.getOutErrors())
                .lastUpdated(i.getLastUpdated())
                .utilizationPct(calculateUtilization(i))
                .build()).collect(Collectors.toList());
    }

    private double calculateUtilization(InterfaceEntity iface) {
        if (iface.getSpeedBps() == null || iface.getSpeedBps() <= 0) return 0.0;
        long totalOctets = (iface.getInOctets() != null ? iface.getInOctets() : 0) + (iface.getOutOctets() != null ? iface.getOutOctets() : 0);
        double utilization = (totalOctets * 8.0) / (iface.getSpeedBps() * 60.0) * 100.0;
        return Math.min(99.9, Math.round(utilization * 10.0) / 10.0);
    }
}
