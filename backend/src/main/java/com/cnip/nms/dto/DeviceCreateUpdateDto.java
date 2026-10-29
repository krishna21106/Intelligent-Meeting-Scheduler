package com.cnip.nms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class DeviceCreateUpdateDto {
    @NotBlank(message = "Device name is required")
    private String name;

    @NotBlank(message = "IP address is required")
    @Pattern(
        regexp = "^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$",
        message = "Invalid IPv4 address format"
    )
    private String ipAddress;

    @NotBlank(message = "Device type is required")
    private String deviceType;

    @NotBlank(message = "Vendor is required")
    private String vendor;

    @NotBlank(message = "Model is required")
    private String model;

    @NotBlank(message = "Site is required")
    private String site;

    private String location;
    private String status = "UP";
    private String snmpVersion = "v2c";
    private String snmpCommunity = "public";
    private Integer snmpPort = 161;
    private String tags;
    private Long customerId;

    public DeviceCreateUpdateDto() {}

    public DeviceCreateUpdateDto(String name, String ipAddress, String deviceType, String vendor,
                                 String model, String site, String location, String status,
                                 String snmpVersion, String snmpCommunity, Integer snmpPort, String tags) {
        this.name = name;
        this.ipAddress = ipAddress;
        this.deviceType = deviceType;
        this.vendor = vendor;
        this.model = model;
        this.site = site;
        this.location = location;
        this.status = status != null ? status : "UP";
        this.snmpVersion = snmpVersion != null ? snmpVersion : "v2c";
        this.snmpCommunity = snmpCommunity != null ? snmpCommunity : "public";
        this.snmpPort = snmpPort != null ? snmpPort : 161;
        this.tags = tags;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }
    public String getVendor() { return vendor; }
    public void setVendor(String vendor) { this.vendor = vendor; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSite() { return site; }
    public void setSite(String site) { this.site = site; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSnmpVersion() { return snmpVersion; }
    public void setSnmpVersion(String snmpVersion) { this.snmpVersion = snmpVersion; }
    public String getSnmpCommunity() { return snmpCommunity; }
    public void setSnmpCommunity(String snmpCommunity) { this.snmpCommunity = snmpCommunity; }
    public Integer getSnmpPort() { return snmpPort; }
    public void setSnmpPort(Integer snmpPort) { this.snmpPort = snmpPort; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String name;
        private String ipAddress;
        private String deviceType;
        private String vendor;
        private String model;
        private String site;
        private String location;
        private String status = "UP";
        private String snmpVersion = "v2c";
        private String snmpCommunity = "public";
        private Integer snmpPort = 161;
        private String tags;

        public Builder name(String name) { this.name = name; return this; }
        public Builder ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
        public Builder deviceType(String deviceType) { this.deviceType = deviceType; return this; }
        public Builder vendor(String vendor) { this.vendor = vendor; return this; }
        public Builder model(String model) { this.model = model; return this; }
        public Builder site(String site) { this.site = site; return this; }
        public Builder location(String location) { this.location = location; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder snmpVersion(String snmpVersion) { this.snmpVersion = snmpVersion; return this; }
        public Builder snmpCommunity(String snmpCommunity) { this.snmpCommunity = snmpCommunity; return this; }
        public Builder snmpPort(Integer snmpPort) { this.snmpPort = snmpPort; return this; }
        public Builder tags(String tags) { this.tags = tags; return this; }
        public DeviceCreateUpdateDto build() {
            return new DeviceCreateUpdateDto(name, ipAddress, deviceType, vendor, model, site, location, status, snmpVersion, snmpCommunity, snmpPort, tags);
        }
    }
}
