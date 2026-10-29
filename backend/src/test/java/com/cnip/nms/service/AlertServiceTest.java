package com.cnip.nms.service;

import com.cnip.nms.dto.AlertActionDto;
import com.cnip.nms.entity.Alert;
import com.cnip.nms.entity.AlertRule;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.repository.AlertRepository;
import com.cnip.nms.repository.AlertRuleRepository;
import com.cnip.nms.repository.MetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertRuleRepository alertRuleRepository;

    @Mock
    private MetricRepository metricRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AlertService alertService;

    private Device sampleDevice;
    private AlertRule sampleRule;
    private Alert sampleAlert;

    @BeforeEach
    void setUp() {
        sampleDevice = Device.builder()
                .id(1L)
                .name("core-router")
                .ipAddress("10.0.0.1")
                .status("UP")
                .build();

        sampleRule = AlertRule.builder()
                .id(10L)
                .name("High CPU Utilization")
                .metricType("CPU")
                .operator("GREATER_THAN")
                .thresholdValue(85.0)
                .durationSeconds(0)
                .severity("CRITICAL")
                .enabled(true)
                .build();

        sampleAlert = Alert.builder()
                .id(100L)
                .device(sampleDevice)
                .rule(sampleRule)
                .severity("CRITICAL")
                .title("High CPU: core-router")
                .message("CPU at 92%")
                .status("ACTIVE")
                .triggeredAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testEvaluateMetricsGeneratesAlertWhenThresholdExceeded() {
        when(alertRuleRepository.findByEnabledTrue()).thenReturn(List.of(sampleRule));
        when(alertRepository.existsByDeviceIdAndRuleIdAndStatus(1L, 10L, "ACTIVE")).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenReturn(sampleAlert);

        alertService.evaluateMetricsForDevice(sampleDevice, 92.0, 50.0, 2.0, 0.0, "UP");

        verify(alertRepository).save(any(Alert.class));
        verify(notificationService).dispatchAlertNotification(any(Alert.class));
    }

    @Test
    void testAcknowledgeAlert() {
        when(alertRepository.findById(100L)).thenReturn(Optional.of(sampleAlert));

        AlertActionDto action = AlertActionDto.builder()
                .alertIds(List.of(100L))
                .action("ACKNOWLEDGE")
                .build();

        alertService.handleAlertAction(action);

        assertEquals("ACKNOWLEDGED", sampleAlert.getStatus());
        assertNotNull(sampleAlert.getAcknowledgedAt());
        verify(alertRepository).save(sampleAlert);
    }

    @Test
    void testSustainedCpuThresholdTriggersAlert() {
        sampleRule.setDurationSeconds(60);
        LocalDateTime now = LocalDateTime.now();
        when(alertRuleRepository.findByEnabledTrue()).thenReturn(List.of(sampleRule));
        when(metricRepository.findMetricsSince(eq(1L), any(LocalDateTime.class))).thenReturn(List.of(
                Metric.builder().device(sampleDevice).cpuUsage(90.0).recordedAt(now.minusSeconds(65)).build(),
                Metric.builder().device(sampleDevice).cpuUsage(92.0).recordedAt(now).build()));
        when(metricRepository.findFirstByDeviceIdAndRecordedAtLessThanEqualOrderByRecordedAtDesc(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.of(Metric.builder().device(sampleDevice).cpuUsage(90.0).recordedAt(now.minusSeconds(65)).build()));
        when(alertRepository.existsByDeviceIdAndRuleIdAndStatus(1L, 10L, "ACTIVE")).thenReturn(false);

        alertService.evaluateMetricsForDevice(sampleDevice, 92.0, 50.0, 2.0, 0.0, "UP");

        verify(alertRepository).save(any(Alert.class));
    }

    @Test
    void testDoesNotTriggerBeforeThresholdDuration() {
        sampleRule.setDurationSeconds(300);
        when(alertRuleRepository.findByEnabledTrue()).thenReturn(List.of(sampleRule));
        when(metricRepository.findFirstByDeviceIdAndRecordedAtLessThanEqualOrderByRecordedAtDesc(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(alertRepository.existsByDeviceIdAndRuleIdAndStatus(1L, 10L, "ACTIVE")).thenReturn(false);

        alertService.evaluateMetricsForDevice(sampleDevice, 92.0, 50.0, 2.0, 0.0, "UP");

        verify(alertRepository, never()).save(any(Alert.class));
    }
}
