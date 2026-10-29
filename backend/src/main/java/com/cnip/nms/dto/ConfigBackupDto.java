package com.cnip.nms.dto;

import java.time.LocalDateTime;

public class ConfigBackupDto {
    private Long id;
    private Long deviceId;
    private String deviceName;
    private Integer version;
    private String backupType;
    private String configuration;
    private String checksum;
    private LocalDateTime backedUpAt;
    private String backedUpBy;

    public ConfigBackupDto() {}

    public ConfigBackupDto(Long id, Long deviceId, String deviceName, Integer version, String backupType,
                           String configuration, String checksum, LocalDateTime backedUpAt, String backedUpBy) {
        this.id = id;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.version = version;
        this.backupType = backupType;
        this.configuration = configuration;
        this.checksum = checksum;
        this.backedUpAt = backedUpAt;
        this.backedUpBy = backedUpBy;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
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
        private Long deviceId;
        private String deviceName;
        private Integer version;
        private String backupType;
        private String configuration;
        private String checksum;
        private LocalDateTime backedUpAt;
        private String backedUpBy;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder deviceId(Long deviceId) { this.deviceId = deviceId; return this; }
        public Builder deviceName(String deviceName) { this.deviceName = deviceName; return this; }
        public Builder version(Integer version) { this.version = version; return this; }
        public Builder backupType(String backupType) { this.backupType = backupType; return this; }
        public Builder configuration(String configuration) { this.configuration = configuration; return this; }
        public Builder checksum(String checksum) { this.checksum = checksum; return this; }
        public Builder backedUpAt(LocalDateTime backedUpAt) { this.backedUpAt = backedUpAt; return this; }
        public Builder backedUpBy(String backedUpBy) { this.backedUpBy = backedUpBy; return this; }
        public ConfigBackupDto build() {
            return new ConfigBackupDto(id, deviceId, deviceName, version, backupType, configuration, checksum, backedUpAt, backedUpBy);
        }
    }
}
