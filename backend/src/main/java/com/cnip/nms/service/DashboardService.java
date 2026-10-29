package com.cnip.nms.service;

import com.cnip.nms.dto.*;
import com.cnip.nms.entity.Alert;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.InterfaceEntity;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final DeviceRepository deviceRepository;
    private final InterfaceRepository interfaceRepository;
    private final AlertRepository alertRepository;
    private final MetricRepository metricRepository;
    private final AlertService alertService;
    private final DeviceService deviceService;

    public DashboardService(
            DeviceRepository deviceRepository,
            InterfaceRepository interfaceRepository,
            AlertRepository alertRepository,
            MetricRepository metricRepository,
            AlertService alertService,
            DeviceService deviceService) {
        this.deviceRepository = deviceRepository;
        this.interfaceRepository = interfaceRepository;
        this.alertRepository = alertRepository;
        this.metricRepository = metricRepository;
        this.alertService = alertService;
        this.deviceService = deviceService;
    }

    public DashboardSummaryDto getDashboardSummary() {
        List<Device> devices = deviceRepository.findAll();
        long total = devices.size();

        long up = devices.stream().filter(d -> "UP".equalsIgnoreCase(d.getStatus())).count();
        long down = devices.stream().filter(d -> "DOWN".equalsIgnoreCase(d.getStatus())).count();
        long warning = devices.stream().filter(d -> "WARNING".equalsIgnoreCase(d.getStatus())).count();
        long maint = devices.stream().filter(d -> "MAINTENANCE".equalsIgnoreCase(d.getStatus())).count();

        double healthScore = 100.0;
        if (total > 0) {
            double raw = ((up * 100.0) + (warning * 65.0) + (maint * 85.0)) / total;
            healthScore = Math.round(raw * 10.0) / 10.0;
        }

        // Alert counts
        long activeAlerts = alertRepository.countByStatus("ACTIVE");
        List<Object[]> alertSeverityCounts = alertRepository.countActiveAlertsBySeverity();
        long criticalAlerts = 0;
        long warningAlerts = 0;
        for (Object[] row : alertSeverityCounts) {
            String sev = (String) row[0];
            Long cnt = (Long) row[1];
            if ("CRITICAL".equalsIgnoreCase(sev)) criticalAlerts = cnt;
            else if ("WARNING".equalsIgnoreCase(sev)) warningAlerts = cnt;
        }

        // Group counts by site and type
        Map<String, Long> bySite = devices.stream()
                .collect(Collectors.groupingBy(Device::getSite, Collectors.counting()));
        Map<String, Long> byType = devices.stream()
                .collect(Collectors.groupingBy(Device::getDeviceType, Collectors.counting()));

        // Live Traffic chart (last 12 points, spaced by minutes)
        List<DashboardSummaryDto.TrafficPointDto> liveTraffic = generateLiveTrafficSeries();

        // Top 5 Busiest Interfaces
        List<InterfaceEntity> topIfaces = interfaceRepository.findTop10BusiestInterfaces();
        List<InterfaceDto> top5 = topIfaces.stream().limit(5).map(i -> InterfaceDto.builder()
                .id(i.getId())
                .deviceId(i.getDevice().getId())
                .deviceName(i.getDevice().getName())
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

        // Recent alerts
        List<AlertDto> recentAlerts = alertService.getRecentAlerts().stream().limit(6).collect(Collectors.toList());

        // Devices needing attention (DOWN, WARNING)
        List<DeviceDto> needingAttention = devices.stream()
                .filter(d -> !"UP".equalsIgnoreCase(d.getStatus()))
                .map(d -> deviceService.getDeviceById(d.getId()))
                .collect(Collectors.toList());

        return DashboardSummaryDto.builder()
                .totalDevices(total)
                .upDevices(up)
                .downDevices(down)
                .warningDevices(warning)
                .maintenanceDevices(maint)
                .networkHealthScore(healthScore)
                .activeAlertsCount(activeAlerts)
                .criticalAlertsCount(criticalAlerts)
                .warningAlertsCount(warningAlerts)
                .devicesBySite(bySite)
                .devicesByType(byType)
                .liveTraffic(liveTraffic)
                .topBusiestInterfaces(top5)
                .recentAlerts(recentAlerts)
                .devicesNeedingAttention(needingAttention)
                .build();
    }

    private List<DashboardSummaryDto.TrafficPointDto> generateLiveTrafficSeries() {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        List<DashboardSummaryDto.TrafficPointDto> points = new ArrayList<>();

        for (int i = 11; i >= 0; i--) {
            LocalDateTime pointTime = now.minusMinutes(i * 5L);
            double hour = pointTime.getHour() + (pointTime.getMinute() / 60.0);
            double diurnal = 0.35 + 0.65 * (0.5 * (1.0 + Math.sin(Math.PI * (hour - 8.0) / 12.0)));
            double baseInGbps = 4.2 * diurnal;
            double baseOutGbps = 3.8 * diurnal;

            // Random variance
            double inJitter = (Math.sin(i * 1.5) * 0.4) + ((pointTime.getSecond() % 7) * 0.05);
            double outJitter = (Math.cos(i * 1.5) * 0.3) + ((pointTime.getSecond() % 5) * 0.04);

            double finalIn = Math.max(0.8, Math.round((baseInGbps + inJitter) * 100.0) / 100.0);
            double finalOut = Math.max(0.6, Math.round((baseOutGbps + outJitter) * 100.0) / 100.0);

            points.add(new DashboardSummaryDto.TrafficPointDto(
                    pointTime.format(formatter),
                    finalIn,
                    finalOut
            ));
        }

        return points;
    }

    private double calculateUtilization(InterfaceEntity iface) {
        if (iface.getSpeedBps() == null || iface.getSpeedBps() <= 0) return 0.0;
        long totalOctets = (iface.getInOctets() != null ? iface.getInOctets() : 0) + (iface.getOutOctets() != null ? iface.getOutOctets() : 0);
        double utilization = (totalOctets * 8.0) / (iface.getSpeedBps() * 60.0) * 100.0;
        return Math.min(99.9, Math.round(utilization * 10.0) / 10.0);
    }
}
