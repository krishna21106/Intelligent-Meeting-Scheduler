package com.cnip.nms.service;

import com.cnip.nms.dto.PageResponse;
import com.cnip.nms.entity.AuditLog;
import com.cnip.nms.repository.AuditLogRepository;
import com.cnip.nms.security.SecurityUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void logAction(String username, String action, String entityType, String entityId, String details) {
        AuditLog auditLog = AuditLog.builder()
                .username(username != null ? username : SecurityUtils.getCurrentUsername())
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .clientIp("127.0.0.1")
                .createdAt(LocalDateTime.now())
                .build();
        try {
            auditLogRepository.save(auditLog);
        } catch (DataAccessException exception) {
            throw new IllegalStateException("Could not persist audit event " + action, exception);
        }
    }

    public PageResponse<AuditLog> getAuditLogs(String search, String action, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<AuditLog> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (action != null && !action.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("action"), action));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                var searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("username")), pattern),
                        cb.like(cb.lower(root.get("details")), pattern),
                        cb.like(cb.lower(root.get("entityType")), pattern)
                );
                predicates = cb.and(predicates, searchPredicate);
            }
            return predicates;
        };

        Page<AuditLog> logPage = auditLogRepository.findAll(spec, pageable);
        return PageResponse.from(logPage);
    }
}
