package com.cnip.nms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vlans")
public class Vlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer vlanId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String subnet;

    @Column(length = 255)
    private String description;

    public Vlan() {}

    public Vlan(Long id, Integer vlanId, String name, String subnet, String description) {
        this.id = id;
        this.vlanId = vlanId;
        this.name = name;
        this.subnet = subnet;
        this.description = description;
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

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Integer vlanId;
        private String name;
        private String subnet;
        private String description;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder vlanId(Integer vlanId) { this.vlanId = vlanId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder subnet(String subnet) { this.subnet = subnet; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Vlan build() { return new Vlan(id, vlanId, name, subnet, description); }
    }
}
