package com.cnip.nms.repository;

import com.cnip.nms.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long>, JpaSpecificationExecutor<Device> {
    Optional<Device> findByName(String name);
    Optional<Device> findByIpAddress(String ipAddress);
    boolean existsByName(String name);
    boolean existsByIpAddress(String ipAddress);
    List<Device> findBySite(String site);
    List<Device> findByStatus(String status);
    Page<Device> findByCustomerIdOrderByNameAsc(Long customerId, Pageable pageable);
    long countByStatus(String status);

    @Query("SELECT d.status, COUNT(d) FROM Device d GROUP BY d.status")
    List<Object[]> countGroupByStatus();

    @Query("SELECT d.site, COUNT(d) FROM Device d GROUP BY d.site")
    List<Object[]> countGroupBySite();

    @Query("SELECT d.deviceType, COUNT(d) FROM Device d GROUP BY d.deviceType")
    List<Object[]> countGroupByDeviceType();
}
