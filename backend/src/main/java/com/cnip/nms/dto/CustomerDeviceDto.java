package com.cnip.nms.dto;

import java.time.LocalDateTime;

public record CustomerDeviceDto(
        Long id,
        String name,
        String ipAddress,
        String deviceType,
        String vendor,
        String model,
        String site,
        String location,
        String status,
        LocalDateTime lastSeen,
        Double latestCpuUsage,
        Double latestMemoryUsage,
        Double latestLatencyMs
) {}
