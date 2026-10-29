package com.cnip.nms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AlertRuleDto {
    private Long id;

    @NotBlank(message = "Rule name is required")
    private String name;

    @NotBlank(message = "Metric type is required")
    private String metricType;

    @NotBlank(message = "Operator is required")
    private String operator;

    @NotNull(message = "Threshold value is required")
    private Double thresholdValue;

    private Integer durationSeconds = 60;

    @NotBlank(message = "Severity is required")
    private String severity;

    private Boolean enabled = true;

    public AlertRuleDto() {}

    public AlertRuleDto(Long id, String name, String metricType, String operator, Double thresholdValue,
                        Integer durationSeconds, String severity, Boolean enabled) {
        this.id = id;
        this.name = name;
        this.metricType = metricType;
        this.operator = operator;
        this.thresholdValue = thresholdValue;
        this.durationSeconds = durationSeconds != null ? durationSeconds : 60;
        this.severity = severity;
        this.enabled = enabled != null ? enabled : true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getMetricType() { return metricType; }
    public void setMetricType(String metricType) { this.metricType = metricType; }
    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }
    public Double getThresholdValue() { return thresholdValue; }
    public void setThresholdValue(Double thresholdValue) { this.thresholdValue = thresholdValue; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String name;
        private String metricType;
        private String operator;
        private Double thresholdValue;
        private Integer durationSeconds = 60;
        private String severity;
        private Boolean enabled = true;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder metricType(String metricType) { this.metricType = metricType; return this; }
        public Builder operator(String operator) { this.operator = operator; return this; }
        public Builder thresholdValue(Double thresholdValue) { this.thresholdValue = thresholdValue; return this; }
        public Builder durationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; return this; }
        public Builder severity(String severity) { this.severity = severity; return this; }
        public Builder enabled(Boolean enabled) { this.enabled = enabled; return this; }
        public AlertRuleDto build() {
            return new AlertRuleDto(id, name, metricType, operator, thresholdValue, durationSeconds, severity, enabled);
        }
    }
}
