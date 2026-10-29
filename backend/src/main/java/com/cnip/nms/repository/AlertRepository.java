package com.cnip.nms.repository;

import com.cnip.nms.entity.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {
    List<Alert> findByDeviceIdOrderByTriggeredAtDesc(Long deviceId);
    List<Alert> findByStatusOrderByTriggeredAtDesc(String status);
    @Query("SELECT a FROM Alert a LEFT JOIN FETCH a.device LEFT JOIN FETCH a.rule ORDER BY a.triggeredAt DESC LIMIT 10")
    List<Alert> findTop10ByOrderByTriggeredAtDesc();
    long countByStatus(String status);
    boolean existsByDeviceIdAndRuleIdAndStatus(Long deviceId, Long ruleId, String status);

    @Query("SELECT a FROM Alert a WHERE a.device.customerId = :customerId ORDER BY a.triggeredAt DESC")
    Page<Alert> findByCustomerId(@Param("customerId") Long customerId, Pageable pageable);

    @Query("SELECT a.severity, COUNT(a) FROM Alert a WHERE a.status = 'ACTIVE' GROUP BY a.severity")
    List<Object[]> countActiveAlertsBySeverity();
}
