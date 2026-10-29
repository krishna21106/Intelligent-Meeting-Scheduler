package com.cnip.nms.simulator;

import com.cnip.nms.entity.Device;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service("simulatedSnmpService")
@ConditionalOnProperty(name = "nms.simulator.enabled", havingValue = "true", matchIfMissing = true)
public class SimulatedSnmpService implements SnmpPollingService {

    private static final Logger log = LoggerFactory.getLogger(SimulatedSnmpService.class);

    private final Random random = new Random();

    @Override
    public DevicePollResult pollDevice(Device device) {
        String baseStatus = device.getStatus();

        // If the device is marked DOWN or in MAINTENANCE, return zeroed metrics
        if ("DOWN".equalsIgnoreCase(baseStatus)) {
            return DevicePollResult.builder()
                    .status("DOWN")
                    .latencyMs(999.0)
                    .cpuUsage(0.0)
                    .memoryUsage(0.0)
                    .packetLossPct(100.0)
                    .bytesInDelta(0L)
                    .bytesOutDelta(0L)
                    .uptimeSeconds(0L)
                    .interfaceData(createEmptyInterfaceData(device, "DOWN"))
                    .build();
        }

        if ("MAINTENANCE".equalsIgnoreCase(baseStatus)) {
            return DevicePollResult.builder()
                    .status("MAINTENANCE")
                    .latencyMs(1.5 + random.nextDouble() * 2.0)
                    .cpuUsage(5.0 + random.nextDouble() * 5.0)
                    .memoryUsage(30.0 + random.nextDouble() * 5.0)
                    .packetLossPct(0.0)
                    .bytesInDelta(1024L)
                    .bytesOutDelta(1024L)
                    .uptimeSeconds(12000000L)
                    .interfaceData(createEmptyInterfaceData(device, "UP"))
                    .build();
        }

        // Calculate diurnal traffic curve (peak at 14:00, trough at 03:00)
        LocalTime now = LocalTime.now();
        double hour = now.getHour() + (now.getMinute() / 60.0);
        // Sinusoidal curve between 0.35 (night) and 1.0 (peak business hours)
        double diurnalMultiplier = 0.35 + 0.65 * (0.5 * (1.0 + Math.sin(Math.PI * (hour - 8.0) / 12.0)));

        // Base metrics based on device type
        double baseCpu;
        double baseMemory;
        double baseLatency;
        long baseBandwidthBps;

        switch (device.getDeviceType().toUpperCase()) {
            case "ROUTER" -> {
                baseCpu = 35.0;
                baseMemory = 55.0;
                baseLatency = 2.5;
                baseBandwidthBps = 100_000_000L;
            }
            case "SWITCH" -> {
                baseCpu = 25.0;
                baseMemory = 45.0;
                baseLatency = 1.2;
                baseBandwidthBps = 250_000_000L;
            }
            case "FIREWALL" -> {
                baseCpu = 45.0;
                baseMemory = 65.0;
                baseLatency = 2.0;
                baseBandwidthBps = 150_000_000L;
            }
            case "ACCESS_POINT" -> {
                baseCpu = 40.0;
                baseMemory = 60.0;
                baseLatency = 7.5;
                baseBandwidthBps = 20_000_000L;
            }
            case "SERVER" -> {
                baseCpu = 50.0;
                baseMemory = 70.0;
                baseLatency = 1.5;
                baseBandwidthBps = 80_000_000L;
            }
            default -> {
                baseCpu = 30.0;
                baseMemory = 50.0;
                baseLatency = 3.0;
                baseBandwidthBps = 50_000_000L;
            }
        }

        // Add random jitter (+/- 8%)
        double jitter = (random.nextDouble() - 0.5) * 16.0;
        double cpu = Math.max(5.0, Math.min(99.0, (baseCpu * diurnalMultiplier) + jitter));
        double memory = Math.max(10.0, Math.min(98.0, baseMemory + (random.nextDouble() - 0.5) * 6.0));
        double latency = Math.max(0.5, baseLatency + (random.nextDouble() - 0.5) * 2.0);
        double packetLoss = 0.0;
        String status = "UP";

        // Handle warning devices (e.g. `ash-leaf-sw-03` or `nyc-wifi-ap-03` or random 3% spike)
        if ("WARNING".equalsIgnoreCase(baseStatus) || device.getName().contains("ash-leaf-sw-03") || device.getName().contains("nyc-wifi-ap-03")) {
            status = "WARNING";
            if (device.getName().contains("ash-leaf-sw-03")) {
                cpu = 87.0 + random.nextDouble() * 5.0; // CPU spike above 85%
                packetLoss = 4.0 + random.nextDouble() * 3.0;
            } else if (device.getName().contains("nyc-wifi-ap-03")) {
                latency = 85.0 + random.nextDouble() * 20.0; // High latency
                packetLoss = 2.5 + random.nextDouble() * 2.0;
            }
        }

        long bytesIn = (long) (baseBandwidthBps * diurnalMultiplier * (0.9 + random.nextDouble() * 0.2));
        long bytesOut = (long) (bytesIn * (0.85 + random.nextDouble() * 0.3));
        long uptime = 3600L * 24L * (7 + (device.getId() % 30));

        List<DevicePollResult.InterfacePollData> ifaceData = new ArrayList<>();
        if (device.getInterfaces() != null) {
            for (var iface : device.getInterfaces()) {
                long inDelta = (long) (bytesIn * 0.4 * (0.8 + random.nextDouble() * 0.4));
                long outDelta = (long) (bytesOut * 0.4 * (0.8 + random.nextDouble() * 0.4));
                long inErr = (packetLoss > 1.0) ? (long) (random.nextInt(10) + 1) : 0;
                long outErr = (packetLoss > 1.0) ? (long) (random.nextInt(5)) : 0;
                ifaceData.add(new DevicePollResult.InterfacePollData(
                        iface.getName(),
                        iface.getStatus(),
                        inDelta,
                        outDelta,
                        inErr,
                        outErr
                ));
            }
        }

        return DevicePollResult.builder()
                .status(status)
                .latencyMs(Math.round(latency * 10.0) / 10.0)
                .cpuUsage(Math.round(cpu * 10.0) / 10.0)
                .memoryUsage(Math.round(memory * 10.0) / 10.0)
                .packetLossPct(Math.round(packetLoss * 10.0) / 10.0)
                .bytesInDelta(bytesIn)
                .bytesOutDelta(bytesOut)
                .uptimeSeconds(uptime)
                .interfaceData(ifaceData)
                .build();
    }

    private List<DevicePollResult.InterfacePollData> createEmptyInterfaceData(Device device, String status) {
        List<DevicePollResult.InterfacePollData> list = new ArrayList<>();
        if (device.getInterfaces() != null) {
            for (var iface : device.getInterfaces()) {
                list.add(new DevicePollResult.InterfacePollData(
                        iface.getName(),
                        status,
                        0L, 0L, 0L, 0L
                ));
            }
        }
        return list;
    }

    @Override
    public boolean testConnection(Device device) {
        return !"DOWN".equalsIgnoreCase(device.getStatus());
    }
}
