package com.cnip.nms.service;

import com.cnip.nms.dto.AlertDto;
import com.cnip.nms.dto.CustomerDeviceDto;
import com.cnip.nms.dto.PageResponse;
import com.cnip.nms.entity.Alert;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.entity.User;
import com.cnip.nms.exception.ResourceNotFoundException;
import com.cnip.nms.repository.AlertRepository;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.MetricRepository;
import com.cnip.nms.repository.UserRepository;
import com.cnip.nms.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerPortalService {
    private final DeviceRepository deviceRepository;
    private final AlertRepository alertRepository;
    private final MetricRepository metricRepository;
    private final UserRepository userRepository;

    public CustomerPortalService(DeviceRepository deviceRepository, AlertRepository alertRepository,
                                 MetricRepository metricRepository, UserRepository userRepository) {
        this.deviceRepository = deviceRepository;
        this.alertRepository = alertRepository;
        this.metricRepository = metricRepository;
        this.userRepository = userRepository;
    }

    public PageResponse<CustomerDeviceDto> getDevices(int page, int size) {
        Long customerId = getCurrentCustomerId();
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Device> devices = deviceRepository.findByCustomerIdOrderByNameAsc(customerId, pageable);
        return PageResponse.from(devices.map(this::toCustomerDevice));
    }

    public PageResponse<AlertDto> getAlerts(int page, int size) {
        Long customerId = getCurrentCustomerId();
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Alert> alerts = alertRepository.findByCustomerId(customerId, pageable);
        List<AlertDto> content = alerts.getContent().stream().map(alert -> AlertDto.builder()
                .id(alert.getId())
                .deviceId(alert.getDevice().getId())
                .deviceName(alert.getDevice().getName())
                .deviceIp(alert.getDevice().getIpAddress())
                .deviceSite(alert.getDevice().getSite())
                .ruleId(alert.getRule() != null ? alert.getRule().getId() : null)
                .ruleName(alert.getRule() != null ? alert.getRule().getName() : null)
                .severity(alert.getSeverity())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .status(alert.getStatus())
                .triggeredAt(alert.getTriggeredAt())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .resolvedAt(alert.getResolvedAt())
                .acknowledgedBy(alert.getAcknowledgedBy())
                .build()).toList();
        return PageResponse.<AlertDto>builder()
                .content(content)
                .pageNumber(alerts.getNumber())
                .pageSize(alerts.getSize())
                .totalElements(alerts.getTotalElements())
                .totalPages(alerts.getTotalPages())
                .last(alerts.isLast())
                .build();
    }

    private CustomerDeviceDto toCustomerDevice(Device device) {
        List<Metric> latestMetric = metricRepository.findByDeviceIdOrderByRecordedAtDesc(
                device.getId(), PageRequest.of(0, 1));
        Metric latest = latestMetric.isEmpty() ? null : latestMetric.get(0);
        return new CustomerDeviceDto(
                device.getId(), device.getName(), device.getIpAddress(), device.getDeviceType(),
                device.getVendor(), device.getModel(), device.getSite(), device.getLocation(),
                device.getStatus(), device.getLastSeen(),
                latest != null ? latest.getCpuUsage() : null,
                latest != null ? latest.getMemoryUsage() : null,
                latest != null ? latest.getLatencyMs() : null);
    }

    private Long getCurrentCustomerId() {
        User user = userRepository.findByUsername(SecurityUtils.getCurrentUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Customer account not found"));
        if (!"CUSTOMER".equals(user.getRoleName())) {
            throw new ResourceNotFoundException("Customer account not found");
        }
        return user.getId();
    }
}
