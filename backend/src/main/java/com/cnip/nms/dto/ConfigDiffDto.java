package com.cnip.nms.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ConfigDiffDto {
    private Long deviceId;
    private String deviceName;
    private Integer versionA;
    private Integer versionB;
    private LocalDateTime timestampA;
    private LocalDateTime timestampB;
    private List<DiffLine> lines;

    public ConfigDiffDto() {}

    public ConfigDiffDto(Long deviceId, String deviceName, Integer versionA, Integer versionB,
                         LocalDateTime timestampA, LocalDateTime timestampB, List<DiffLine> lines) {
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.versionA = versionA;
        this.versionB = versionB;
        this.timestampA = timestampA;
        this.timestampB = timestampB;
        this.lines = lines;
    }

    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public Integer getVersionA() { return versionA; }
    public void setVersionA(Integer versionA) { this.versionA = versionA; }
    public Integer getVersionB() { return versionB; }
    public void setVersionB(Integer versionB) { this.versionB = versionB; }
    public LocalDateTime getTimestampA() { return timestampA; }
    public void setTimestampA(LocalDateTime timestampA) { this.timestampA = timestampA; }
    public LocalDateTime getTimestampB() { return timestampB; }
    public void setTimestampB(LocalDateTime timestampB) { this.timestampB = timestampB; }
    public List<DiffLine> getLines() { return lines; }
    public void setLines(List<DiffLine> lines) { this.lines = lines; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long deviceId;
        private String deviceName;
        private Integer versionA;
        private Integer versionB;
        private LocalDateTime timestampA;
        private LocalDateTime timestampB;
        private List<DiffLine> lines;

        public Builder deviceId(Long deviceId) { this.deviceId = deviceId; return this; }
        public Builder deviceName(String deviceName) { this.deviceName = deviceName; return this; }
        public Builder versionA(Integer versionA) { this.versionA = versionA; return this; }
        public Builder versionB(Integer versionB) { this.versionB = versionB; return this; }
        public Builder timestampA(LocalDateTime timestampA) { this.timestampA = timestampA; return this; }
        public Builder timestampB(LocalDateTime timestampB) { this.timestampB = timestampB; return this; }
        public Builder lines(List<DiffLine> lines) { this.lines = lines; return this; }
        public ConfigDiffDto build() {
            return new ConfigDiffDto(deviceId, deviceName, versionA, versionB, timestampA, timestampB, lines);
        }
    }

    public static class DiffLine {
        private String type;
        private String text;
        private Integer lineNumberA;
        private Integer lineNumberB;

        public DiffLine() {}

        public DiffLine(String type, String text, Integer lineNumberA, Integer lineNumberB) {
            this.type = type;
            this.text = text;
            this.lineNumberA = lineNumberA;
            this.lineNumberB = lineNumberB;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        public Integer getLineNumberA() { return lineNumberA; }
        public void setLineNumberA(Integer lineNumberA) { this.lineNumberA = lineNumberA; }
        public Integer getLineNumberB() { return lineNumberB; }
        public void setLineNumberB(Integer lineNumberB) { this.lineNumberB = lineNumberB; }
    }
}
