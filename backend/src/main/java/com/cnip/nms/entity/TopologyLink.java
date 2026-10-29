package com.cnip.nms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "topology_links")
public class TopologyLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_device_id", nullable = false)
    private Device sourceDevice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_device_id", nullable = false)
    private Device targetDevice;

    @Column(nullable = false, length = 100)
    private String sourceInterface;

    @Column(nullable = false, length = 100)
    private String targetInterface;

    @Column(nullable = false, length = 20)
    private String linkStatus = "UP";

    @Column(nullable = false)
    private Double bandwidthUtilizationPct = 0.0;

    @Column(nullable = false)
    private Long capacityMbps = 10000L;

    public TopologyLink() {}

    public TopologyLink(Long id, Device sourceDevice, Device targetDevice, String sourceInterface,
                        String targetInterface, String linkStatus, Double bandwidthUtilizationPct,
                        Long capacityMbps) {
        this.id = id;
        this.sourceDevice = sourceDevice;
        this.targetDevice = targetDevice;
        this.sourceInterface = sourceInterface;
        this.targetInterface = targetInterface;
        this.linkStatus = linkStatus != null ? linkStatus : "UP";
        this.bandwidthUtilizationPct = bandwidthUtilizationPct != null ? bandwidthUtilizationPct : 0.0;
        this.capacityMbps = capacityMbps != null ? capacityMbps : 10000L;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Device getSourceDevice() { return sourceDevice; }
    public void setSourceDevice(Device sourceDevice) { this.sourceDevice = sourceDevice; }
    public Device getTargetDevice() { return targetDevice; }
    public void setTargetDevice(Device targetDevice) { this.targetDevice = targetDevice; }
    public String getSourceInterface() { return sourceInterface; }
    public void setSourceInterface(String sourceInterface) { this.sourceInterface = sourceInterface; }
    public String getTargetInterface() { return targetInterface; }
    public void setTargetInterface(String targetInterface) { this.targetInterface = targetInterface; }
    public String getLinkStatus() { return linkStatus; }
    public void setLinkStatus(String linkStatus) { this.linkStatus = linkStatus; }
    public Double getBandwidthUtilizationPct() { return bandwidthUtilizationPct; }
    public void setBandwidthUtilizationPct(Double bandwidthUtilizationPct) { this.bandwidthUtilizationPct = bandwidthUtilizationPct; }
    public Long getCapacityMbps() { return capacityMbps; }
    public void setCapacityMbps(Long capacityMbps) { this.capacityMbps = capacityMbps; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Device sourceDevice;
        private Device targetDevice;
        private String sourceInterface;
        private String targetInterface;
        private String linkStatus = "UP";
        private Double bandwidthUtilizationPct = 0.0;
        private Long capacityMbps = 10000L;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder sourceDevice(Device sourceDevice) { this.sourceDevice = sourceDevice; return this; }
        public Builder targetDevice(Device targetDevice) { this.targetDevice = targetDevice; return this; }
        public Builder sourceInterface(String sourceInterface) { this.sourceInterface = sourceInterface; return this; }
        public Builder targetInterface(String targetInterface) { this.targetInterface = targetInterface; return this; }
        public Builder linkStatus(String linkStatus) { this.linkStatus = linkStatus; return this; }
        public Builder bandwidthUtilizationPct(Double bandwidthUtilizationPct) { this.bandwidthUtilizationPct = bandwidthUtilizationPct; return this; }
        public Builder capacityMbps(Long capacityMbps) { this.capacityMbps = capacityMbps; return this; }
        public TopologyLink build() {
            return new TopologyLink(id, sourceDevice, targetDevice, sourceInterface, targetInterface, linkStatus, bandwidthUtilizationPct, capacityMbps);
        }
    }
}
