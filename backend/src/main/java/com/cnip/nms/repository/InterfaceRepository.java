package com.cnip.nms.repository;

import com.cnip.nms.entity.InterfaceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterfaceRepository extends JpaRepository<InterfaceEntity, Long> {
    List<InterfaceEntity> findByDeviceId(Long deviceId);

    @Query("SELECT i FROM InterfaceEntity i JOIN FETCH i.device ORDER BY (i.inOctets + i.outOctets) DESC LIMIT 10")
    List<InterfaceEntity> findTop10BusiestInterfaces();
}

