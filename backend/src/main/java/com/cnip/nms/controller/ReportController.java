package com.cnip.nms.controller;

import com.cnip.nms.dto.ReportSummaryDto;
import com.cnip.nms.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports & SLA", description = "Endpoints for SLA compliance, performance analytics, and PDF/CSV export")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    @Operation(summary = "Get SLA and performance summary metrics")
    public ResponseEntity<ReportSummaryDto> getReportSummary(@RequestParam(required = false) String site) {
        return ResponseEntity.ok(reportService.getReportSummary(site));
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Export SLA and performance report in CSV format")
    public ResponseEntity<byte[]> exportCsv(@RequestParam(required = false) String site) {
        String csv = reportService.exportReportCsv(site);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cnip-sla-report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }

    @GetMapping("/export/pdf")
    @Operation(summary = "Export SLA and performance report in branded PDF format")
    public ResponseEntity<byte[]> exportPdf(@RequestParam(required = false) String site) {
        byte[] pdfBytes = reportService.exportReportPdf(site);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cnip-sla-report.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}

