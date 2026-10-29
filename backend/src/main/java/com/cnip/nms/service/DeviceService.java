package com.cnip.nms.service;

import com.cnip.nms.dto.*;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.InterfaceEntity;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.entity.User;
import com.cnip.nms.exception.BadRequestException;
import com.cnip.nms.exception.ResourceNotFoundException;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.InterfaceRepository;
import com.cnip.nms.repository.MetricRepository;
import com.cnip.nms.repository.UserRepository;
import com.cnip.nms.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DeviceService {

    private static final Logger log = LoggerFactory.getLogger(DeviceService.class);

    private final DeviceRepository deviceRepository;
    private final InterfaceRepository interfaceRepository;
    private final MetricRepository metricRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    public DeviceService(DeviceRepository deviceRepository, InterfaceRepository interfaceRepository,
                         MetricRepository metricRepository, AuditLogService auditLogService,
                         UserRepository userRepository) {
        this.deviceRepository = deviceRepository;
        this.interfaceRepository = interfaceRepository;
        this.metricRepository = metricRepository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
    }

    public PageResponse<DeviceDto> getDevices(String search, String site, String deviceType, String status, int page, int size, String sortBy, String sortDir) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir != null ? sortDir : "ASC"), sortBy != null ? sortBy : "id");
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<Device> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (site != null && !site.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("site"), site));
            }
            if (deviceType != null && !deviceType.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("deviceType"), deviceType));
            }
            if (status != null && !status.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                var searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("ipAddress")), pattern),
                        cb.like(cb.lower(root.get("vendor")), pattern),
                        cb.like(cb.lower(root.get("model")), pattern),
                        cb.like(cb.lower(root.get("tags")), pattern)
                );
                predicates = cb.and(predicates, searchPredicate);
            }

            return predicates;
        };

        Page<Device> devicePage = deviceRepository.findAll(spec, pageable);
        List<DeviceDto> dtos = devicePage.getContent().stream()
                .map(this::mapToDtoSummary)
                .collect(Collectors.toList());

        return PageResponse.<DeviceDto>builder()
                .content(dtos)
                .pageNumber(devicePage.getNumber())
                .pageSize(devicePage.getSize())
                .totalElements(devicePage.getTotalElements())
                .totalPages(devicePage.getTotalPages())
                .last(devicePage.isLast())
                .build();
    }

    public DeviceDto getDeviceById(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + id));

        DeviceDto dto = mapToDtoSummary(device);

        List<InterfaceEntity> interfaces = interfaceRepository.findByDeviceId(id);
        dto.setInterfaces(interfaces.stream().map(iface -> InterfaceDto.builder()
                .id(iface.getId())
                .deviceId(device.getId())
                .deviceName(device.getName())
                .name(iface.getName())
                .macAddress(iface.getMacAddress())
                .ipAddress(iface.getIpAddress())
                .status(iface.getStatus())
                .speedBps(iface.getSpeedBps())
                .inOctets(iface.getInOctets())
                .outOctets(iface.getOutOctets())
                .inErrors(iface.getInErrors())
                .outErrors(iface.getOutErrors())
                .lastUpdated(iface.getLastUpdated())
                .utilizationPct(calculateUtilization(iface))
                .build()).collect(Collectors.toList()));

        return dto;
    }

    @Transactional
    public DeviceDto createDevice(DeviceCreateUpdateDto dto) {
        if (deviceRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Device with name '" + dto.getName() + "' already exists");
        }
        if (deviceRepository.existsByIpAddress(dto.getIpAddress())) {
            throw new BadRequestException("Device with IP '" + dto.getIpAddress() + "' already exists");
        }

        Device device = Device.builder()
                .name(dto.getName())
                .ipAddress(dto.getIpAddress())
                .deviceType(dto.getDeviceType())
                .vendor(dto.getVendor())
                .model(dto.getModel())
                .site(dto.getSite())
                .location(dto.getLocation())
                .status(dto.getStatus() != null ? dto.getStatus() : "UP")
                .snmpVersion(dto.getSnmpVersion() != null ? dto.getSnmpVersion() : "v2c")
                .snmpCommunity(dto.getSnmpCommunity() != null ? dto.getSnmpCommunity() : "public")
                .snmpPort(dto.getSnmpPort() != null ? dto.getSnmpPort() : 161)
                .tags(dto.getTags())
                .customerId(validateCustomerAssignment(dto.getCustomerId()))
                .createdAt(LocalDateTime.now())
                .lastSeen(LocalDateTime.now())
                .build();

        Device saved = deviceRepository.save(device);

        InterfaceEntity defaultIface = InterfaceEntity.builder()
                .device(saved)
                .name("eth0")
                .ipAddress(saved.getIpAddress())
                .status("UP")
                .speedBps(1000000000L)
                .inOctets(0L)
                .outOctets(0L)
                .build();
        interfaceRepository.save(defaultIface);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "CREATE_DEVICE", "DEVICE", String.valueOf(saved.getId()),
                "Created device " + saved.getName() + " (" + saved.getIpAddress() + ")");

        return getDeviceById(saved.getId());
    }

    @Transactional
    public DeviceDto updateDevice(Long id, DeviceCreateUpdateDto dto) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + id));

        if (!device.getName().equalsIgnoreCase(dto.getName()) && deviceRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Device with name '" + dto.getName() + "' already exists");
        }
        if (!device.getIpAddress().equalsIgnoreCase(dto.getIpAddress()) && deviceRepository.existsByIpAddress(dto.getIpAddress())) {
            throw new BadRequestException("Device with IP '" + dto.getIpAddress() + "' already exists");
        }

        device.setName(dto.getName());
        device.setIpAddress(dto.getIpAddress());
        device.setDeviceType(dto.getDeviceType());
        device.setVendor(dto.getVendor());
        device.setModel(dto.getModel());
        device.setSite(dto.getSite());
        device.setLocation(dto.getLocation());
        if (dto.getStatus() != null) {
            device.setStatus(dto.getStatus());
        }
        if (dto.getSnmpVersion() != null) {
            device.setSnmpVersion(dto.getSnmpVersion());
        }
        if (dto.getSnmpCommunity() != null) {
            device.setSnmpCommunity(dto.getSnmpCommunity());
        }
        if (dto.getSnmpPort() != null) {
            device.setSnmpPort(dto.getSnmpPort());
        }
        device.setTags(dto.getTags());
        if (dto.getCustomerId() != null) {
            device.setCustomerId(validateCustomerAssignment(dto.getCustomerId()));
        }

        Device saved = deviceRepository.save(device);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "UPDATE_DEVICE", "DEVICE", String.valueOf(saved.getId()),
                "Updated device " + saved.getName());

        return getDeviceById(saved.getId());
    }

    @Transactional
    public DeviceDto assignCustomer(Long deviceId, Long customerId) {
        User actor = userRepository.findByUsername(SecurityUtils.getCurrentUsername())
                .orElseThrow(() -> new AccessDeniedException("Only administrators can assign devices to customers"));
        if (!"ADMIN".equals(actor.getRoleName())) {
            throw new AccessDeniedException("Only administrators can assign devices to customers");
        }
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + deviceId));
        device.setCustomerId(validateCustomerAssignment(customerId));
        Device saved = deviceRepository.save(device);
        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "ASSIGN_DEVICE_CUSTOMER", "DEVICE",
                String.valueOf(deviceId), customerId == null
                        ? "Removed customer assignment from " + saved.getName()
                        : "Assigned " + saved.getName() + " to customer account " + customerId);
        return getDeviceById(saved.getId());
    }

    @Transactional
    public void deleteDevice(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + id));

        String name = device.getName();
        deviceRepository.delete(device);

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "DELETE_DEVICE", "DEVICE", String.valueOf(id),
                "Deleted device " + name);
    }

    public String exportDevicesCsv() {
        List<Device> devices = deviceRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        StringBuilder sb = new StringBuilder();
        sb.append("id,name,ipAddress,deviceType,vendor,model,site,location,status,snmpVersion,snmpCommunity,snmpPort,tags\n");

        for (Device d : devices) {
            sb.append(d.getId()).append(",")
                    .append(escapeCsv(d.getName())).append(",")
                    .append(escapeCsv(d.getIpAddress())).append(",")
                    .append(escapeCsv(d.getDeviceType())).append(",")
                    .append(escapeCsv(d.getVendor())).append(",")
                    .append(escapeCsv(d.getModel())).append(",")
                    .append(escapeCsv(d.getSite())).append(",")
                    .append(escapeCsv(d.getLocation())).append(",")
                    .append(escapeCsv(d.getStatus())).append(",")
                    .append(escapeCsv(d.getSnmpVersion())).append(",")
                    .append(escapeCsv(d.getSnmpCommunity())).append(",")
                    .append(d.getSnmpPort()).append(",")
                    .append(escapeCsv(d.getTags())).append("\n");
        }

        return sb.toString();
    }

    @Transactional
    public int importDevicesCsv(MultipartFile file) {
        int importedCount = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] tokens = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (tokens.length >= 7) {
                    String name = cleanCsv(tokens.length > 1 ? tokens[1] : "");
                    String ip = cleanCsv(tokens.length > 2 ? tokens[2] : "");
                    String type = cleanCsv(tokens.length > 3 ? tokens[3] : "ROUTER");
                    String vendor = cleanCsv(tokens.length > 4 ? tokens[4] : "Cisco");
                    String model = cleanCsv(tokens.length > 5 ? tokens[5] : "Generic");
                    String site = cleanCsv(tokens.length > 6 ? tokens[6] : "HQ - New York");
                    String location = tokens.length > 7 ? cleanCsv(tokens[7]) : "";
                    String tags = tokens.length > 12 ? cleanCsv(tokens[12]) : "imported";

                    if (!deviceRepository.existsByName(name) && !deviceRepository.existsByIpAddress(ip)) {
                        Device device = Device.builder()
                                .name(name)
                                .ipAddress(ip)
                                .deviceType(type)
                                .vendor(vendor)
                                .model(model)
                                .site(site)
                                .location(location)
                                .status("UP")
                                .tags(tags)
                                .build();
                        deviceRepository.save(device);
                        importedCount++;
                    }
                }
            }
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse CSV file: " + e.getMessage());
        }

        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "IMPORT_CSV", "DEVICE", "BULK",
                "Imported " + importedCount + " devices via CSV");

        return importedCount;
    }

    private DeviceDto mapToDtoSummary(Device device) {
        DeviceDto dto = DeviceDto.builder()
                .id(device.getId())
                .name(device.getName())
                .ipAddress(device.getIpAddress())
                .deviceType(device.getDeviceType())
                .vendor(device.getVendor())
                .model(device.getModel())
                .site(device.getSite())
                .location(device.getLocation())
                .status(device.getStatus())
                .snmpVersion(device.getSnmpVersion())
                .snmpCommunity(device.getSnmpCommunity())
                .snmpPort(device.getSnmpPort())
                .tags(device.getTags())
                .customerId(device.getCustomerId())
                .lastSeen(device.getLastSeen())
                .createdAt(device.getCreatedAt())
                .build();

        List<Metric> recent = metricRepository.findByDeviceIdOrderByRecordedAtDesc(device.getId(), PageRequest.of(0, 1));
        if (!recent.isEmpty()) {
            Metric m = recent.get(0);
            dto.setLatestCpuUsage(m.getCpuUsage());
            dto.setLatestMemoryUsage(m.getMemoryUsage());
            dto.setLatestLatencyMs(m.getLatencyMs());
            dto.setLatestPacketLossPct(m.getPacketLossPct());
            dto.setLatestUptimeSeconds(m.getUptimeSeconds());
        }

        return dto;
    }

    private Long validateCustomerAssignment(Long customerId) {
        if (customerId == null) {
            return null;
        }

        User actor = userRepository.findByUsername(SecurityUtils.getCurrentUsername())
                .orElseThrow(() -> new AccessDeniedException("Only administrators can assign devices to customers"));
        if (!"ADMIN".equals(actor.getRoleName())) {
            throw new AccessDeniedException("Only administrators can assign devices to customers");
        }

        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer account not found"));
        if (!"CUSTOMER".equals(customer.getRoleName())) {
            throw new BadRequestException("Devices can only be assigned to customer accounts");
        }
        return customer.getId();
    }

    private double calculateUtilization(InterfaceEntity iface) {
        if (iface.getSpeedBps() == null || iface.getSpeedBps() <= 0) return 0.0;
        long totalOctets = (iface.getInOctets() != null ? iface.getInOctets() : 0) + (iface.getOutOctets() != null ? iface.getOutOctets() : 0);
        double utilization = (totalOctets * 8.0) / (iface.getSpeedBps() * 60.0) * 100.0;
        return Math.min(99.9, Math.round(utilization * 10.0) / 10.0);
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }

    private String cleanCsv(String val) {
        if (val == null) return "";
        val = val.trim();
        if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
            val = val.substring(1, val.length() - 1).replace("\"\"", "\"");
        }
        return val;
    }
}
