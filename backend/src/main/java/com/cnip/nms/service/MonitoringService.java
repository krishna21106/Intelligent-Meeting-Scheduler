package com.cnip.nms.service;

import com.cnip.nms.dto.MetricDto;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.InterfaceEntity;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.InterfaceRepository;
import com.cnip.nms.repository.MetricRepository;
import com.cnip.nms.simulator.DevicePollResult;
import com.cnip.nms.simulator.SnmpPollingService;
import org.springframework.beans.factory.ObjectProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MonitoringService {

    private static final Logger log = LoggerFactory.getLogger(MonitoringService.class);

    private final DeviceRepository deviceRepository;
    private final InterfaceRepository interfaceRepository;
    private final MetricRepository metricRepository;
    private final SnmpPollingService snmpPollingService;
    private final AlertService alertService;
    private final ObjectProvider<MonitoringService> monitoringServiceProvider;

    @Value("${nms.simulator.retention-days:7}")
    private int retentionDays;

    public MonitoringService(DeviceRepository deviceRepository, InterfaceRepository interfaceRepository,
                             MetricRepository metricRepository, SnmpPollingService snmpPollingService,
                             AlertService alertService, ObjectProvider<MonitoringService> monitoringServiceProvider) {
        this.deviceRepository = deviceRepository;
        this.interfaceRepository = interfaceRepository;
        this.metricRepository = metricRepository;
        this.snmpPollingService = snmpPollingService;
        this.alertService = alertService;
        this.monitoringServiceProvider = monitoringServiceProvider;
    }

    @Scheduled(fixedDelayString = "${nms.simulator.polling-interval-ms:10000}", initialDelay = 3000)
    public void scheduleDevicePolling() {
        List<Device> devices = deviceRepository.findAll();
        for (Device device : devices) {
            monitoringServiceProvider.getObject().pollDeviceAsync(device.getId());
        }
    }

    @Async("pollingTaskExecutor")
    @Transactional
    public void pollDeviceAsync(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalStateException("Device disappeared before polling: " + deviceId));
        try {
            DevicePollResult pollResult = snmpPollingService.pollDevice(device);
            LocalDateTime now = LocalDateTime.now();

            Metric metric = Metric.builder()
                    .device(device)
                    .cpuUsage(pollResult.getCpuUsage())
                    .memoryUsage(pollResult.getMemoryUsage())
                    .latencyMs(pollResult.getLatencyMs())
                    .packetLossPct(pollResult.getPacketLossPct())
                    .bytesInPerSec(pollResult.getBytesInDelta())
                    .bytesOutPerSec(pollResult.getBytesOutDelta())
                    .uptimeSeconds(pollResult.getUptimeSeconds())
                    .recordedAt(now)
                    .build();
            metricRepository.save(metric);

            if (!"MAINTENANCE".equalsIgnoreCase(device.getStatus())) {
                device.setStatus(pollResult.getStatus());
            }
            if ("UP".equalsIgnoreCase(pollResult.getStatus())) {
                device.setLastSeen(now);
            }
            deviceRepository.save(device);

            if (pollResult.getInterfaceData() != null) {
                for (var ifData : pollResult.getInterfaceData()) {
                    List<InterfaceEntity> matching = interfaceRepository.findByDeviceId(device.getId()).stream()
                            .filter(i -> i.getName().equalsIgnoreCase(ifData.getInterfaceName()))
                            .toList();
                    for (InterfaceEntity iface : matching) {
                        iface.setInOctets(iface.getInOctets() + ifData.getInOctetsDelta());
                        iface.setOutOctets(iface.getOutOctets() + ifData.getOutOctetsDelta());
                        iface.setInErrors(iface.getInErrors() + ifData.getInErrorsDelta());
                        iface.setOutErrors(iface.getOutErrors() + ifData.getOutErrorsDelta());
                        iface.setStatus(ifData.getStatus());
                        interfaceRepository.save(iface);
                    }
                }
            }

            alertService.evaluateMetricsForDevice(device, pollResult.getCpuUsage(), pollResult.getMemoryUsage(),
                    pollResult.getLatencyMs(), pollResult.getPacketLossPct(), pollResult.getStatus());

        } catch (RuntimeException e) {
            log.error("Error during async polling of device {}", device.getName(), e);
            throw e;
        }
    }

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldMetrics() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        int deleted = metricRepository.deleteOldMetrics(cutoff);
        log.info("Metrics retention cleanup: deleted {} records older than {}", deleted, cutoff);
    }

    public List<MetricDto> getDeviceMetrics(Long deviceId, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours > 0 ? hours : 24);
        List<Metric> metrics = metricRepository.findMetricsSince(deviceId, since);
        return metrics.stream().map(m -> MetricDto.builder()
                .id(m.getId())
                .deviceId(deviceId)
                .cpuUsage(m.getCpuUsage())
                .memoryUsage(m.getMemoryUsage())
                .latencyMs(m.getLatencyMs())
                .packetLossPct(m.getPacketLossPct())
                .bytesInPerSec(m.getBytesInPerSec())
                .bytesOutPerSec(m.getBytesOutPerSec())
                .uptimeSeconds(m.getUptimeSeconds())
                .recordedAt(m.getRecordedAt())
                .build()).collect(Collectors.toList());
    }
}
