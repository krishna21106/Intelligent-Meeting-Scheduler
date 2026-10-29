package com.cnip.nms.service;

import com.cnip.nms.dto.TopologyGraphDto;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.entity.TopologyLink;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.MetricRepository;
import com.cnip.nms.repository.TopologyLinkRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TopologyService {

    private final DeviceRepository deviceRepository;
    private final TopologyLinkRepository linkRepository;
    private final MetricRepository metricRepository;

    public TopologyService(DeviceRepository deviceRepository, TopologyLinkRepository linkRepository, MetricRepository metricRepository) {
        this.deviceRepository = deviceRepository;
        this.linkRepository = linkRepository;
        this.metricRepository = metricRepository;
    }

    public TopologyGraphDto getTopologyGraph(String siteFilter) {
        List<Device> devices = deviceRepository.findAll();
        List<TopologyLink> links = linkRepository.findAll();

        if (siteFilter != null && !siteFilter.isBlank() && !"ALL".equalsIgnoreCase(siteFilter)) {
            devices = devices.stream().filter(d -> d.getSite().equalsIgnoreCase(siteFilter)).toList();
            Set<Long> deviceIds = new HashSet<>();
            devices.forEach(d -> deviceIds.add(d.getId()));
            links = links.stream().filter(l -> deviceIds.contains(l.getSourceDevice().getId()) && deviceIds.contains(l.getTargetDevice().getId())).toList();
        }

        List<TopologyGraphDto.NodeDto> nodes = new ArrayList<>();
        for (Device d : devices) {
            double[] pos = calculateNodePosition(d);
            Map<String, Object> data = new HashMap<>();
            data.put("id", d.getId());
            data.put("label", d.getName());
            data.put("ip", d.getIpAddress());
            data.put("status", d.getStatus());
            data.put("deviceType", d.getDeviceType());
            data.put("vendor", d.getVendor());
            data.put("model", d.getModel());
            data.put("site", d.getSite());
            data.put("location", d.getLocation());

            List<Metric> recent = metricRepository.findByDeviceIdOrderByRecordedAtDesc(d.getId(), PageRequest.of(0, 1));
            if (!recent.isEmpty()) {
                Metric m = recent.get(0);
                data.put("cpu", m.getCpuUsage());
                data.put("memory", m.getMemoryUsage());
                data.put("latency", m.getLatencyMs());
            } else {
                data.put("cpu", 25.0);
                data.put("memory", 45.0);
                data.put("latency", 2.0);
            }

            nodes.add(TopologyGraphDto.NodeDto.builder()
                    .id(String.valueOf(d.getId()))
                    .type(d.getDeviceType().toLowerCase())
                    .position(new TopologyGraphDto.Position(pos[0], pos[1]))
                    .data(data)
                    .build());
        }

        List<TopologyGraphDto.EdgeDto> edges = new ArrayList<>();
        for (TopologyLink l : links) {
            boolean isDegraded = "DEGRADED".equalsIgnoreCase(l.getLinkStatus()) || l.getBandwidthUtilizationPct() > 80.0;
            boolean isDown = "DOWN".equalsIgnoreCase(l.getLinkStatus());

            String strokeColor = "#6366f1"; // Indigo default
            if (isDown) strokeColor = "#ef4444"; // Red
            else if (isDegraded) strokeColor = "#f59e0b"; // Amber
            else if (l.getBandwidthUtilizationPct() < 40.0) strokeColor = "#10b981"; // Emerald green

            Map<String, Object> style = new HashMap<>();
            style.put("stroke", strokeColor);
            style.put("strokeWidth", Math.max(2.0, (l.getCapacityMbps() / 10000.0) + 1.5));

            Map<String, Object> edgeData = new HashMap<>();
            edgeData.put("sourceInterface", l.getSourceInterface());
            edgeData.put("targetInterface", l.getTargetInterface());
            edgeData.put("linkStatus", l.getLinkStatus());
            edgeData.put("utilization", l.getBandwidthUtilizationPct());
            edgeData.put("capacityMbps", l.getCapacityMbps());

            edges.add(TopologyGraphDto.EdgeDto.builder()
                    .id("edge-" + l.getId())
                    .source(String.valueOf(l.getSourceDevice().getId()))
                    .target(String.valueOf(l.getTargetDevice().getId()))
                    .label(String.format("%.1f%%", l.getBandwidthUtilizationPct()))
                    .animated(l.getBandwidthUtilizationPct() > 30.0 && !isDown)
                    .style(style)
                    .data(edgeData)
                    .build());
        }

        return TopologyGraphDto.builder()
                .nodes(nodes)
                .edges(edges)
                .build();
    }

    private double[] calculateNodePosition(Device d) {
        // Layout clustered by site with tier hierarchy
        double siteOffsetX = 0.0;
        if (d.getSite().contains("New York")) siteOffsetX = 100.0;
        else if (d.getSite().contains("Ashburn")) siteOffsetX = 900.0;
        else if (d.getSite().contains("Frankfurt")) siteOffsetX = 1700.0;

        long idOffset = d.getId() % 6;
        double x = siteOffsetX + (idOffset * 110.0);
        double y;

        switch (d.getDeviceType().toUpperCase()) {
            case "FIREWALL" -> y = 80.0 + ((d.getId() % 2) * 50.0);
            case "ROUTER" -> y = 180.0 + ((d.getId() % 2) * 50.0);
            case "SWITCH" -> {
                if (d.getName().contains("dist") || d.getName().contains("spine") || d.getName().contains("core")) {
                    y = 320.0 + ((d.getId() % 2) * 60.0);
                } else {
                    y = 460.0 + ((d.getId() % 4) * 50.0);
                }
            }
            case "ACCESS_POINT" -> y = 620.0 + ((d.getId() % 3) * 60.0);
            case "SERVER" -> y = 620.0 + ((d.getId() % 4) * 60.0);
            default -> y = 400.0;
        }

        return new double[]{x, y};
    }
}
