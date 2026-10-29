package com.cnip.nms.repository;

import com.cnip.nms.entity.TopologyLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TopologyLinkRepository extends JpaRepository<TopologyLink, Long> {
    List<TopologyLink> findBySourceDeviceIdOrTargetDeviceId(Long sourceId, Long targetId);
}

