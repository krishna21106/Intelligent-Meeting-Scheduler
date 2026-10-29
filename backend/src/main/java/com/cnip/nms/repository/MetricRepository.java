package com.cnip.nms.repository;

import com.cnip.nms.entity.Metric;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MetricRepository extends JpaRepository<Metric, Long> {
    List<Metric> findByDeviceIdOrderByRecordedAtDesc(Long deviceId, Pageable pageable);
    Optional<Metric> findFirstByDeviceIdAndRecordedAtLessThanEqualOrderByRecordedAtDesc(
            Long deviceId, LocalDateTime recordedAt);

    @Query("SELECT m FROM Metric m WHERE m.device.id = :deviceId AND m.recordedAt >= :since ORDER BY m.recordedAt ASC")
    List<Metric> findMetricsSince(@Param("deviceId") Long deviceId, @Param("since") LocalDateTime since);

    @Query("SELECT m FROM Metric m WHERE m.recordedAt >= :since ORDER BY m.recordedAt ASC")
    List<Metric> findAllMetricsSince(@Param("since") LocalDateTime since);

    @Modifying
    @Query("DELETE FROM Metric m WHERE m.recordedAt < :cutoff")
    int deleteOldMetrics(@Param("cutoff") LocalDateTime cutoff);
}
