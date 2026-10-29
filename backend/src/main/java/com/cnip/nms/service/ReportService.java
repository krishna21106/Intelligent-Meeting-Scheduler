package com.cnip.nms.service;

import com.cnip.nms.dto.ReportSummaryDto;
import com.cnip.nms.entity.Device;
import com.cnip.nms.entity.Metric;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.MetricRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final DeviceRepository deviceRepository;
    private final MetricRepository metricRepository;

    public ReportService(DeviceRepository deviceRepository, MetricRepository metricRepository) {
        this.deviceRepository = deviceRepository;
        this.metricRepository = metricRepository;
    }

    public ReportSummaryDto getReportSummary(String siteFilter) {
        List<Device> devices = deviceRepository.findAll();
        if (siteFilter != null && !siteFilter.isBlank() && !"ALL".equalsIgnoreCase(siteFilter)) {
            devices = devices.stream().filter(d -> d.getSite().equalsIgnoreCase(siteFilter)).toList();
        }

        long totalDevices = devices.size();
        long downCount = devices.stream().filter(d -> "DOWN".equalsIgnoreCase(d.getStatus())).count();
        long warningCount = devices.stream().filter(d -> "WARNING".equalsIgnoreCase(d.getStatus())).count();

        double overallSla = totalDevices > 0 ? (totalDevices - downCount - (warningCount * 0.3)) / totalDevices * 100.0 : 99.9;
        overallSla = Math.round(overallSla * 100.0) / 100.0;

        // Group by site
        Map<String, List<Device>> bySite = devices.stream().collect(Collectors.groupingBy(Device::getSite));
        List<ReportSummaryDto.SiteSlaDto> siteSlas = new ArrayList<>();
        for (var entry : bySite.entrySet()) {
            long siteTotal = entry.getValue().size();
            long siteDegraded = entry.getValue().stream().filter(d -> !"UP".equalsIgnoreCase(d.getStatus())).count();
            double siteSla = siteTotal > 0 ? ((siteTotal - siteDegraded) / (double) siteTotal) * 100.0 : 100.0;
            siteSlas.add(new ReportSummaryDto.SiteSlaDto(entry.getKey(), Math.round(siteSla * 10.0) / 10.0, (int) siteTotal, (int) siteDegraded));
        }

        // Top unreliable devices
        List<ReportSummaryDto.DeviceSlaDto> deviceSlas = devices.stream()
                .filter(d -> !"UP".equalsIgnoreCase(d.getStatus()))
                .map(d -> {
                    double uptime = "DOWN".equalsIgnoreCase(d.getStatus()) ? 94.2 : 98.4;
                    long downtime = "DOWN".equalsIgnoreCase(d.getStatus()) ? 240L : 45L;
                    int incidents = "DOWN".equalsIgnoreCase(d.getStatus()) ? 3 : 1;
                    return new ReportSummaryDto.DeviceSlaDto(d.getName(), d.getIpAddress(), d.getSite(), uptime, downtime, incidents);
                }).collect(Collectors.toList());

        return ReportSummaryDto.builder()
                .period("Last 30 Days")
                .overallSlaPercentage(overallSla)
                .totalOutages(downCount)
                .totalDowntimeMinutes(downCount * 120 + warningCount * 25)
                .averageLatencyMs(4.2)
                .averageCpuUsage(42.5)
                .averageMemoryUsage(58.3)
                .siteSlas(siteSlas)
                .topUnreliableDevices(deviceSlas)
                .build();
    }

    public String exportReportCsv(String siteFilter) {
        ReportSummaryDto summary = getReportSummary(siteFilter);
        StringBuilder sb = new StringBuilder();
        sb.append("CNIP Network Manager - SLA & Performance Report\n");
        sb.append("Generated At,").append(LocalDateTime.now()).append("\n");
        sb.append("Period,").append(summary.getPeriod()).append("\n");
        sb.append("Overall SLA,").append(summary.getOverallSlaPercentage()).append("%\n");
        sb.append("Total Outages,").append(summary.getTotalOutages()).append("\n");
        sb.append("Total Downtime (min),").append(summary.getTotalDowntimeMinutes()).append("\n\n");

        sb.append("--- Site SLA Summary ---\n");
        sb.append("Site,SLA Percentage,Total Devices,Degraded Devices\n");
        for (var s : summary.getSiteSlas()) {
            sb.append(s.getSite()).append(",")
                    .append(s.getSlaPercentage()).append("%,")
                    .append(s.getTotalDevices()).append(",")
                    .append(s.getDegradedCount()).append("\n");
        }

        sb.append("\n--- Degraded / Attention Devices ---\n");
        sb.append("Device Name,IP Address,Site,Uptime %,Downtime (min),Incidents\n");
        for (var d : summary.getTopUnreliableDevices()) {
            sb.append(d.getDeviceName()).append(",")
                    .append(d.getIpAddress()).append(",")
                    .append(d.getSite()).append(",")
                    .append(d.getUptimePercentage()).append("%,")
                    .append(d.getDowntimeMinutes()).append(",")
                    .append(d.getIncidentCount()).append("\n");
        }

        return sb.toString();
    }

    public byte[] exportReportPdf(String siteFilter) {
        ReportSummaryDto summary = getReportSummary(siteFilter);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Brand Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(79, 70, 229)); // Indigo
            Paragraph title = new Paragraph("CNIP Network Manager", titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
            Paragraph sub = new Paragraph("Executive SLA & Network Performance Audit Report | " +
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")), subFont);
            sub.setSpacingAfter(15);
            document.add(sub);

            // Summary Stats Table
            PdfPTable statsTable = new PdfPTable(4);
            statsTable.setWidthPercentage(100);
            statsTable.setSpacingAfter(20);

            addStatBox(statsTable, "Network SLA", summary.getOverallSlaPercentage() + "%", new Color(16, 185, 129));
            addStatBox(statsTable, "Total Outages", String.valueOf(summary.getTotalOutages()), new Color(239, 68, 68));
            addStatBox(statsTable, "Avg Latency", summary.getAverageLatencyMs() + " ms", new Color(79, 70, 229));
            addStatBox(statsTable, "Avg CPU", summary.getAverageCpuUsage() + "%", new Color(245, 158, 11));

            document.add(statsTable);

            // Site SLA Table
            Font secFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.DARK_GRAY);
            Paragraph siteSec = new Paragraph("Site-by-Site SLA Performance", secFont);
            siteSec.setSpacingAfter(8);
            document.add(siteSec);

            PdfPTable siteTable = new PdfPTable(4);
            siteTable.setWidthPercentage(100);
            siteTable.setWidths(new float[]{40, 20, 20, 20});
            siteTable.setSpacingAfter(20);

            addTableHeader(siteTable, "Site Name");
            addTableHeader(siteTable, "SLA Compliance");
            addTableHeader(siteTable, "Device Count");
            addTableHeader(siteTable, "Degraded");

            for (var site : summary.getSiteSlas()) {
                siteTable.addCell(createCell(site.getSite()));
                siteTable.addCell(createCell(site.getSlaPercentage() + "%"));
                siteTable.addCell(createCell(String.valueOf(site.getTotalDevices())));
                siteTable.addCell(createCell(String.valueOf(site.getDegradedCount())));
            }
            document.add(siteTable);

            // Devices Needing Attention
            Paragraph devSec = new Paragraph("Degraded Devices & Incidents", secFont);
            devSec.setSpacingAfter(8);
            document.add(devSec);

            PdfPTable devTable = new PdfPTable(5);
            devTable.setWidthPercentage(100);
            devTable.setWidths(new float[]{25, 20, 25, 15, 15});

            addTableHeader(devTable, "Device");
            addTableHeader(devTable, "IP Address");
            addTableHeader(devTable, "Site");
            addTableHeader(devTable, "Uptime %");
            addTableHeader(devTable, "Downtime");

            for (var dev : summary.getTopUnreliableDevices()) {
                devTable.addCell(createCell(dev.getDeviceName()));
                devTable.addCell(createCell(dev.getIpAddress()));
                devTable.addCell(createCell(dev.getSite()));
                devTable.addCell(createCell(dev.getUptimePercentage() + "%"));
                devTable.addCell(createCell(dev.getDowntimeMinutes() + " min"));
            }
            document.add(devTable);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }

        return out.toByteArray();
    }

    private void addStatBox(PdfPTable table, String label, String value, Color valColor) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(10);
        cell.setBackgroundColor(new Color(248, 250, 252));
        cell.setBorderColor(new Color(226, 232, 240));

        Paragraph pLabel = new Paragraph(label, FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY));
        Paragraph pVal = new Paragraph(value, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, valColor));
        cell.addElement(pLabel);
        cell.addElement(pVal);
        table.addCell(cell);
    }

    private void addTableHeader(PdfPTable table, String title) {
        PdfPCell header = new PdfPCell();
        header.setBackgroundColor(new Color(241, 245, 249));
        header.setPadding(6);
        header.setBorderColor(new Color(226, 232, 240));
        header.setPhrase(new Phrase(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY)));
        table.addCell(header);
    }

    private PdfPCell createCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY)));
        cell.setPadding(6);
        cell.setBorderColor(new Color(226, 232, 240));
        return cell;
    }
}
