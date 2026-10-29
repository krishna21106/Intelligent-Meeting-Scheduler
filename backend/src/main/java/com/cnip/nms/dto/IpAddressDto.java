package com.cnip.nms.dto;

import jakarta.validation.constraints.NotBlank;

public class IpAddressDto {
    private Long id;

    @NotBlank(message = "IP address is required")
    private String ipAddress;

    @NotBlank(message = "Subnet is required")
    private String subnet;

    private String status = "AVAILABLE";
    private Long deviceId;
    private String deviceName;
    private Long vlanId;
    private Integer vlanNumber;
    private String vlanName;
    private String dnsName;

    public IpAddressDto() {}

    public IpAddressDto(Long id, String ipAddress, String subnet, String status, Long deviceId,
                        String deviceName, Long vlanId, Integer vlanNumber, String vlanName, String dnsName) {
        this.id = id;
        this.ipAddress = ipAddress;
        this.subnet = subnet;
        this.status = status != null ? status : "AVAILABLE";
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.vlanId = vlanId;
        this.vlanNumber = vlanNumber;
        this.vlanName = vlanName;
        this.dnsName = dnsName;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getSubnet() { return subnet; }
    public void setSubnet(String subnet) { this.subnet = subnet; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public Long getVlanId() { return vlanId; }
    public void setVlanId(Long vlanId) { this.vlanId = vlanId; }
    public Integer getVlanNumber() { return vlanNumber; }
    public void setVlanNumber(Integer vlanNumber) { this.vlanNumber = vlanNumber; }
    public String getVlanName() { return vlanName; }
    public void setVlanName(String vlanName) { this.vlanName = vlanName; }
    public String getDnsName() { return dnsName; }
    public void setDnsName(String dnsName) { this.dnsName = dnsName; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String ipAddress;
        private String subnet;
        private String status = "AVAILABLE";
        private Long deviceId;
        private String deviceName;
        private Long vlanId;
        private Integer vlanNumber;
        private String vlanName;
        private String dnsName;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
        public Builder subnet(String subnet) { this.subnet = subnet; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder deviceId(Long deviceId) { this.deviceId = deviceId; return this; }
        public Builder deviceName(String deviceName) { this.deviceName = deviceName; return this; }
        public Builder vlanId(Long vlanId) { this.vlanId = vlanId; return this; }
        public Builder vlanNumber(Integer vlanNumber) { this.vlanNumber = vlanNumber; return this; }
        public Builder vlanName(String vlanName) { this.vlanName = vlanName; return this; }
        public Builder dnsName(String dnsName) { this.dnsName = dnsName; return this; }
        public IpAddressDto build() {
            return new IpAddressDto(id, ipAddress, subnet, status, deviceId, deviceName, vlanId, vlanNumber, vlanName, dnsName);
        }
    }
}
