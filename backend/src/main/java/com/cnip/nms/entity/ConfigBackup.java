package com.cnip.nms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "config_backups")
public class ConfigBackup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false, length = 50)
    private String backupType = "RUNNING";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String configuration;

    @Column(nullable = false, length = 64)
    private String checksum;

    @Column(nullable = false)
    private LocalDateTime backedUpAt;

    @Column(nullable = false, length = 100)
    private String backedUpBy;

    public ConfigBackup() {}

    public ConfigBackup(Long id, Device device, Integer version, String backupType, String configuration,
                        String checksum, LocalDateTime backedUpAt, String backedUpBy) {
        this.id = id;
        this.device = device;
        this.version = version;
        this.backupType = backupType != null ? backupType : "RUNNING";
        this.configuration = configuration;
        this.checksum = checksum;
        this.backedUpAt = backedUpAt;
        this.backedUpBy = backedUpBy;
    }

    @PrePersist
    protected void onBackup() {
        if (backedUpAt == null) {
            backedUpAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public String getBackupType() { return backupType; }
    public void setBackupType(String backupType) { this.backupType = backupType; }
    public String getConfiguration() { return configuration; }
    public void setConfiguration(String configuration) { this.configuration = configuration; }
    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
    public LocalDateTime getBackedUpAt() { return backedUpAt; }
    public void setBackedUpAt(LocalDateTime backedUpAt) { this.backedUpAt = backedUpAt; }
    public String getBackedUpBy() { return backedUpBy; }
    public void setBackedUpBy(String backedUpBy) { this.backedUpBy = backedUpBy; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Device device;
        private Integer version;
        private String backupType = "RUNNING";
        private String configuration;
        private String checksum;
        private LocalDateTime backedUpAt;
        private String backedUpBy;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder device(Device device) { this.device = device; return this; }
        public Builder version(Integer version) { this.version = version; return this; }
        public Builder backupType(String backupType) { this.backupType = backupType; return this; }
        public Builder configuration(String configuration) { this.configuration = configuration; return this; }
        public Builder checksum(String checksum) { this.checksum = checksum; return this; }
        public Builder backedUpAt(LocalDateTime backedUpAt) { this.backedUpAt = backedUpAt; return this; }
        public Builder backedUpBy(String backedUpBy) { this.backedUpBy = backedUpBy; return this; }
        public ConfigBackup build() {
            return new ConfigBackup(id, device, version, backupType, configuration, checksum, backedUpAt, backedUpBy);
        }
    }
}
