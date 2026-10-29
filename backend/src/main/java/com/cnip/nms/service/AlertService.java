package com.cnip.nms.service;

import com.cnip.nms.dto.*;
import com.cnip.nms.entity.Alert;
import com.cnip.nms.entity.AlertRule;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.exception.BadRequestException;
import com.cnip.nms.exception.ResourceNotFoundException;
import com.cnip.nms.repository.AlertRepository;
import com.cnip.nms.repository.AlertRuleRepository;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.MetricRepository;
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

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final DeviceRepository deviceRepository;
    private final MetricRepository metricRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public AlertService(AlertRepository alertRepository, AlertRuleRepository alertRuleRepository,
                        DeviceRepository deviceRepository, MetricRepository metricRepository,
                        AuditLogService auditLogService,
                        NotificationService notificationService) {
        this.alertRepository = alertRepository;
        this.alertRuleRepository = alertRuleRepository;
        this.deviceRepository = deviceRepository;
        this.metricRepository = metricRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    public PageResponse<AlertDto> getAlerts(String status, String severity, Long deviceId, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "triggeredAt"));

        Specification<Alert> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status.toUpperCase()));
            }
            if (severity != null && !severity.isBlank() && !"ALL".equalsIgnoreCase(severity)) {
                predicates = cb.and(predicates, cb.equal(root.get("severity"), severity.toUpperCase()));
            }
            if (deviceId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("device").get("id"), deviceId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                var searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("message")), pattern),
                        cb.like(cb.lower(root.get("device").get("name")), pattern),
                        cb.like(cb.lower(root.get("device").get("ipAddress")), pattern)
                );
                predicates = cb.and(predicates, searchPredicate);
            }

            return predicates;
        };

        Page<Alert> alertPage = alertRepository.findAll(spec, pageable);
        List<AlertDto> dtos = alertPage.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return PageResponse.<AlertDto>builder()
                .content(dtos)
                .pageNumber(alertPage.getNumber())
                .pageSize(alertPage.getSize())
                .totalElements(alertPage.getTotalElements())
                .totalPages(alertPage.getSize() > 0 ? alertPage.getTotalPages() : 0)
                .last(alertPage.isLast())
                .build();
    }

    public List<AlertDto> getRecentAlerts() {
        return alertRepository.findTop10ByOrderByTriggeredAtDesc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void handleAlertAction(AlertActionDto actionDto) {
        String username = SecurityUtils.getCurrentUsername();
        LocalDateTime now = LocalDateTime.now();

        for (Long alertId : actionDto.getAlertIds()) {
            Alert alert = alertRepository.findById(alertId)
                    .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

            if ("ACKNOWLEDGE".equalsIgnoreCase(actionDto.getAction())) {
                alert.setStatus("ACKNOWLEDGED");
                alert.setAcknowledgedAt(now);
                alert.setAcknowledgedBy(username);
                alertRepository.save(alert);

                auditLogService.logAction(username, "ACKNOWLEDGE_ALERT", "ALERT", String.valueOf(alertId),
                        "Acknowledged alert: " + alert.getTitle());
            } else if ("RESOLVE".equalsIgnoreCase(actionDto.getAction())) {
                alert.setStatus("RESOLVED");
                alert.setResolvedAt(now);
                alertRepository.save(alert);

                auditLogService.logAction(username, "RESOLVE_ALERT", "ALERT", String.valueOf(alertId),
                        "Resolved alert: " + alert.getTitle());
            }
        }
    }

    @Transactional
    public void evaluateMetricsForDevice(Device device, double cpu, double memory, double latency, double packetLoss, String deviceStatus) {
        List<AlertRule> rules = alertRuleRepository.findByEnabledTrue();
        LocalDateTime now = LocalDateTime.now();

        for (AlertRule rule : rules) {
            boolean conditionMet = false;
            String message = "";

            switch (rule.getMetricType().toUpperCase()) {
                case "CPU" -> {
                    conditionMet = checkThreshold(cpu, rule.getOperator(), rule.getThresholdValue());
                    message = String.format("CPU load %.1f%% exceeded threshold %.1f%%", cpu, rule.getThresholdValue());
                }
                case "MEMORY" -> {
                    conditionMet = checkThreshold(memory, rule.getOperator(), rule.getThresholdValue());
                    message = String.format("Memory utilization %.1f%% exceeded threshold %.1f%%", memory, rule.getThresholdValue());
                }
                case "LATENCY" -> {
                    conditionMet = checkThreshold(latency, rule.getOperator(), rule.getThresholdValue());
                    message = String.format("Ping latency %.1fms exceeded threshold %.1fms", latency, rule.getThresholdValue());
                }
                case "PACKET_LOSS" -> {
                    conditionMet = checkThreshold(packetLoss, rule.getOperator(), rule.getThresholdValue());
                    message = String.format("Packet loss %.1f%% exceeded threshold %.1f%%", packetLoss, rule.getThresholdValue());
                }
                case "STATUS" -> {
                    if ("DOWN".equalsIgnoreCase(deviceStatus)) {
                        conditionMet = true;
                        message = "Device is unreachable / failed health probe";
                    }
                }
            }

            boolean activeAlertExists = alertRepository.existsByDeviceIdAndRuleIdAndStatus(device.getId(), rule.getId(), "ACTIVE");

            if (conditionMet && rule.getDurationSeconds() > 0) {
                conditionMet = hasPersistedForDuration(device, rule, now, deviceStatus);
            }

            if (conditionMet && !activeAlertExists) {
                Alert alert = Alert.builder()
                        .device(device)
                        .rule(rule)
                        .severity(rule.getSeverity())
                        .title(rule.getName() + ": " + device.getName())
                        .message(message)
                        .status("ACTIVE")
                        .triggeredAt(LocalDateTime.now())
                        .build();
                Alert savedAlert = alertRepository.save(alert);
                notificationService.dispatchAlertNotification(savedAlert);
            }
        }
    }

    private boolean hasPersistedForDuration(Device device, AlertRule rule, LocalDateTime now, String deviceStatus) {
        LocalDateTime cutoff = now.minusSeconds(rule.getDurationSeconds());
        if ("STATUS".equalsIgnoreCase(rule.getMetricType())) {
            return "DOWN".equalsIgnoreCase(deviceStatus)
                    && device.getLastSeen() != null
                    && Duration.between(device.getLastSeen(), now).getSeconds() >= rule.getDurationSeconds();
        }

        Metric baseline = metricRepository
                .findFirstByDeviceIdAndRecordedAtLessThanEqualOrderByRecordedAtDesc(device.getId(), cutoff)
                .orElse(null);
        if (baseline == null) {
            return false;
        }

        List<Metric> samplesSinceCutoff = metricRepository.findMetricsSince(device.getId(), cutoff);
        return isThresholdExceeded(baseline, rule)
                && !samplesSinceCutoff.isEmpty()
                && samplesSinceCutoff.stream().allMatch(metric -> isThresholdExceeded(metric, rule));
    }

    private boolean isThresholdExceeded(Metric metric, AlertRule rule) {
        double value = switch (rule.getMetricType().toUpperCase()) {
            case "CPU" -> metric.getCpuUsage();
            case "MEMORY" -> metric.getMemoryUsage();
            case "LATENCY" -> metric.getLatencyMs();
            case "PACKET_LOSS" -> metric.getPacketLossPct();
            default -> Double.NaN;
        };
        return checkThreshold(value, rule.getOperator(), rule.getThresholdValue());
    }

    private boolean checkThreshold(double actual, String op, double threshold) {
        return switch (op.toUpperCase()) {
            case "GREATER_THAN", ">" -> actual > threshold;
            case "LESS_THAN", "<" -> actual < threshold;
            case "EQUALS", "==" -> Math.abs(actual - threshold) < 0.001;
            default -> false;
        };
    }

    public List<AlertRuleDto> getAllRules() {
        return alertRuleRepository.findAll().stream().map(r -> AlertRuleDto.builder()
                .id(r.getId())
                .name(r.getName())
                .metricType(r.getMetricType())
                .operator(r.getOperator())
                .thresholdValue(r.getThresholdValue())
                .durationSeconds(r.getDurationSeconds())
                .severity(r.getSeverity())
                .enabled(r.getEnabled())
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public AlertRuleDto updateRule(Long id, AlertRuleDto dto) {
        AlertRule rule = alertRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with id: " + id));

        rule.setName(dto.getName());
        rule.setMetricType(dto.getMetricType());
        rule.setOperator(dto.getOperator());
        rule.setThresholdValue(dto.getThresholdValue());
        rule.setDurationSeconds(dto.getDurationSeconds());
        rule.setSeverity(dto.getSeverity());
        rule.setEnabled(dto.getEnabled());

        AlertRule saved = alertRuleRepository.save(rule);
        auditLogService.logAction(SecurityUtils.getCurrentUsername(), "UPDATE_ALERT_RULE", "RULE", String.valueOf(saved.getId()),
                "Updated alert rule " + saved.getName());

        return dto;
    }

    public AlertDto mapToDto(Alert alert) {
        return AlertDto.builder()
                .id(alert.getId())
                .deviceId(alert.getDevice() != null ? alert.getDevice().getId() : null)
                .deviceName(alert.getDevice() != null ? alert.getDevice().getName() : "Unknown")
                .deviceIp(alert.getDevice() != null ? alert.getDevice().getIpAddress() : "")
                .deviceSite(alert.getDevice() != null ? alert.getDevice().getSite() : "")
                .ruleId(alert.getRule() != null ? alert.getRule().getId() : null)
                .ruleName(alert.getRule() != null ? alert.getRule().getName() : "Custom Rule")
                .severity(alert.getSeverity())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .status(alert.getStatus())
                .triggeredAt(alert.getTriggeredAt())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .resolvedAt(alert.getResolvedAt())
                .acknowledgedBy(alert.getAcknowledgedBy())
                .build();
    }
}
