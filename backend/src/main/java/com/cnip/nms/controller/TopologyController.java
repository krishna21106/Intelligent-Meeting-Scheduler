package com.cnip.nms.controller;

import com.cnip.nms.dto.TopologyGraphDto;
import com.cnip.nms.service.TopologyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/topology")
@RequiredArgsConstructor
@Tag(name = "Network Topology", description = "Endpoints for interactive network map graph (React Flow)")
public class TopologyController {

    private final TopologyService topologyService;

    @GetMapping
    @Operation(summary = "Get topology nodes and edges with link status & utilization")
    public ResponseEntity<TopologyGraphDto> getTopologyGraph(@RequestParam(required = false) String site) {
        return ResponseEntity.ok(topologyService.getTopologyGraph(site));
    }
}

