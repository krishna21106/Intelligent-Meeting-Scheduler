package com.cnip.nms.repository;

import com.cnip.nms.entity.IpAddress;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IpAddressRepository extends JpaRepository<IpAddress, Long>, JpaSpecificationExecutor<IpAddress> {
    Optional<IpAddress> findByIpAddress(String ipAddress);
    boolean existsByIpAddress(String ipAddress);
    List<IpAddress> findBySubnet(String subnet);
    List<IpAddress> findByStatus(String status);
}

