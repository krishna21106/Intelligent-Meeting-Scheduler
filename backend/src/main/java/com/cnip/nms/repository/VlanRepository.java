package com.cnip.nms.repository;

import com.cnip.nms.entity.Vlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VlanRepository extends JpaRepository<Vlan, Long> {
    Optional<Vlan> findByVlanId(Integer vlanId);
    boolean existsByVlanId(Integer vlanId);
}

