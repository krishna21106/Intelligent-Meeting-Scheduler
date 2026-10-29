package com.cnip.nms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class VlanDto {
    private Long id;

    @NotNull(message = "VLAN ID is required")
    private Integer vlanId;

    @NotBlank(message = "VLAN name is required")
    private String name;

    @NotBlank(message = "Subnet is required")
    private String subnet;

    private String description;
    private int allocatedIpCount;
    private int totalIpCapacity;

    public VlanDto() {}

    public VlanDto(Long id, Integer vlanId, String name, String subnet, String description, int allocatedIpCount, int totalIpCapacity) {
        this.id = id;
        this.vlanId = vlanId;
        this.name = name;
        this.subnet = subnet;
        this.description = description;
        this.allocatedIpCount = allocatedIpCount;
        this.totalIpCapacity = totalIpCapacity;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getVlanId() { return vlanId; }
    public void setVlanId(Integer vlanId) { this.vlanId = vlanId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSubnet() { return subnet; }
    public void setSubnet(String subnet) { this.subnet = subnet; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public int getAllocatedIpCount() { return allocatedIpCount; }
    public void setAllocatedIpCount(int allocatedIpCount) { this.allocatedIpCount = allocatedIpCount; }
    public int getTotalIpCapacity() { return totalIpCapacity; }
    public void setTotalIpCapacity(int totalIpCapacity) { this.totalIpCapacity = totalIpCapacity; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Integer vlanId;
        private String name;
        private String subnet;
        private String description;
        private int allocatedIpCount;
        private int totalIpCapacity;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder vlanId(Integer vlanId) { this.vlanId = vlanId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder subnet(String subnet) { this.subnet = subnet; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder allocatedIpCount(int allocatedIpCount) { this.allocatedIpCount = allocatedIpCount; return this; }
        public Builder totalIpCapacity(int totalIpCapacity) { this.totalIpCapacity = totalIpCapacity; return this; }
        public VlanDto build() {
            return new VlanDto(id, vlanId, name, subnet, description, allocatedIpCount, totalIpCapacity);
        }
    }
}
