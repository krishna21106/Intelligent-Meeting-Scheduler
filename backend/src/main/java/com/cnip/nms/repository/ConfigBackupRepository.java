package com.cnip.nms.repository;

import com.cnip.nms.entity.ConfigBackup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConfigBackupRepository extends JpaRepository<ConfigBackup, Long> {
    List<ConfigBackup> findByDeviceIdOrderByVersionDesc(Long deviceId);
    Optional<ConfigBackup> findByDeviceIdAndVersion(Long deviceId, Integer version);

    @Query("SELECT COALESCE(MAX(c.version), 0) FROM ConfigBackup c WHERE c.device.id = :deviceId")
    Integer findLatestVersionByDeviceId(@Param("deviceId") Long deviceId);
}

