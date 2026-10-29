package com.cnip.nms.service;

import com.cnip.nms.dto.ConfigBackupDto;
import com.cnip.nms.dto.ConfigDiffDto;
import com.cnip.nms.entity.ConfigBackup;
import com.cnip.nms.entity.Device;
import com.cnip.nms.exception.BadRequestException;
import com.cnip.nms.exception.ResourceNotFoundException;
import com.cnip.nms.repository.ConfigBackupRepository;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConfigService {

    private final ConfigBackupRepository configBackupRepository;
    private final DeviceRepository deviceRepository;
    private final AuditLogService auditLogService;

    public ConfigService(ConfigBackupRepository configBackupRepository, DeviceRepository deviceRepository, AuditLogService auditLogService) {
        this.configBackupRepository = configBackupRepository;
        this.deviceRepository = deviceRepository;
        this.auditLogService = auditLogService;
    }

    public List<ConfigBackupDto> getDeviceBackups(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));

        return configBackupRepository.findByDeviceIdOrderByVersionDesc(deviceId).stream()
                .map(c -> ConfigBackupDto.builder()
                        .id(c.getId())
                        .deviceId(device.getId())
                        .deviceName(device.getName())
                        .version(c.getVersion())
                        .backupType(c.getBackupType())
                        .configuration(c.getConfiguration())
                        .checksum(c.getChecksum())
                        .backedUpAt(c.getBackedUpAt())
                        .backedUpBy(c.getBackedUpBy())
                        .build())
                .collect(Collectors.toList());
    }

    public ConfigBackupDto getBackupByVersion(Long deviceId, Integer version) {
        ConfigBackup backup = configBackupRepository.findByDeviceIdAndVersion(deviceId, version)
                .orElseThrow(() -> new ResourceNotFoundException("Config version " + version + " not found for device: " + deviceId));

        return ConfigBackupDto.builder()
                .id(backup.getId())
                .deviceId(backup.getDevice().getId())
                .deviceName(backup.getDevice().getName())
                .version(backup.getVersion())
                .backupType(backup.getBackupType())
                .configuration(backup.getConfiguration())
                .checksum(backup.getChecksum())
                .backedUpAt(backup.getBackedUpAt())
                .backedUpBy(backup.getBackedUpBy())
                .build();
    }

    @Transactional
    public ConfigBackupDto triggerBackup(Long deviceId, String backupType) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));

        Integer latestVer = configBackupRepository.findLatestVersionByDeviceId(deviceId);
        int nextVersion = (latestVer != null ? latestVer : 0) + 1;

        String configContent = generateRealisticConfig(device, nextVersion);
        String checksum = calculateSha256(configContent);
        String username = SecurityUtils.getCurrentUsername();

        ConfigBackup backup = ConfigBackup.builder()
                .device(device)
                .version(nextVersion)
                .backupType(backupType != null ? backupType : "RUNNING")
                .configuration(configContent)
                .checksum(checksum)
                .backedUpAt(LocalDateTime.now())
                .backedUpBy(username)
                .build();

        ConfigBackup saved = configBackupRepository.save(backup);

        auditLogService.logAction(username, "BACKUP_CONFIG", "CONFIG", String.valueOf(saved.getId()),
                "Created configuration backup v" + nextVersion + " for " + device.getName());

        return ConfigBackupDto.builder()
                .id(saved.getId())
                .deviceId(device.getId())
                .deviceName(device.getName())
                .version(saved.getVersion())
                .backupType(saved.getBackupType())
                .configuration(saved.getConfiguration())
                .checksum(saved.getChecksum())
                .backedUpAt(saved.getBackedUpAt())
                .backedUpBy(saved.getBackedUpBy())
                .build();
    }

    public ConfigDiffDto compareVersions(Long deviceId, Integer versionA, Integer versionB) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));

        ConfigBackup backupA = configBackupRepository.findByDeviceIdAndVersion(deviceId, versionA)
                .orElseThrow(() -> new ResourceNotFoundException("Config version " + versionA + " not found"));
        ConfigBackup backupB = configBackupRepository.findByDeviceIdAndVersion(deviceId, versionB)
                .orElseThrow(() -> new ResourceNotFoundException("Config version " + versionB + " not found"));

        List<String> linesA = Arrays.asList(backupA.getConfiguration().split("\\r?\\n"));
        List<String> linesB = Arrays.asList(backupB.getConfiguration().split("\\r?\\n"));

        List<ConfigDiffDto.DiffLine> diffLines = computeLineDiff(linesA, linesB);

        return ConfigDiffDto.builder()
                .deviceId(deviceId)
                .deviceName(device.getName())
                .versionA(versionA)
                .versionB(versionB)
                .timestampA(backupA.getBackedUpAt())
                .timestampB(backupB.getBackedUpAt())
                .lines(diffLines)
                .build();
    }

    private List<ConfigDiffDto.DiffLine> computeLineDiff(List<String> linesA, List<String> linesB) {
        List<ConfigDiffDto.DiffLine> result = new ArrayList<>();
        int i = 0, j = 0;
        int lineA = 1, lineB = 1;

        while (i < linesA.size() || j < linesB.size()) {
            if (i < linesA.size() && j < linesB.size() && linesA.get(i).equals(linesB.get(j))) {
                result.add(new ConfigDiffDto.DiffLine("UNCHANGED", linesA.get(i), lineA++, lineB++));
                i++;
                j++;
            } else if (j < linesB.size() && (i >= linesA.size() || !linesB.contains(linesA.get(i)))) {
                result.add(new ConfigDiffDto.DiffLine("ADDED", linesB.get(j), null, lineB++));
                j++;
            } else if (i < linesA.size()) {
                result.add(new ConfigDiffDto.DiffLine("REMOVED", linesA.get(i), lineA++, null));
                i++;
            }
        }
        return result;
    }

    private String generateRealisticConfig(Device device, int version) {
        StringBuilder sb = new StringBuilder();
        sb.append("! CNIP NMS Automated Backup - Version ").append(version).append("\n");
        sb.append("! Device: ").append(device.getName()).append(" (").append(device.getModel()).append(")\n");
        sb.append("! Site: ").append(device.getSite()).append(" | Location: ").append(device.getLocation()).append("\n");
        sb.append("! Timestamp: ").append(LocalDateTime.now()).append("\n!\n");
        sb.append("hostname ").append(device.getName()).append("\n");
        sb.append("ip domain name cnip.network\n");
        sb.append("snmp-server community ").append(device.getSnmpCommunity()).append(" RO\n");
        sb.append("snmp-server location ").append(device.getSite()).append("\n");

        if ("ROUTER".equalsIgnoreCase(device.getDeviceType()) || "SWITCH".equalsIgnoreCase(device.getDeviceType())) {
            sb.append("!\ninterface GigabitEthernet0/0/0\n");
            sb.append(" description Primary Uplink\n");
            sb.append(" ip address ").append(device.getIpAddress()).append(" 255.255.255.0\n");
            sb.append(" no shutdown\n");
            if (version > 1) {
                sb.append(" service-policy output WAN-OPTIMIZE-QOS\n");
                sb.append(" ip flow monitor CNIP-NETFLOW-MON input\n");
            }
            sb.append("!\nrouter bgp 65001\n");
            sb.append(" bgp router-id ").append(device.getIpAddress()).append("\n");
        } else if ("FIREWALL".equalsIgnoreCase(device.getDeviceType())) {
            sb.append("!\nconfig system global\n");
            sb.append(" set hostname ").append(device.getName()).append("\n");
            sb.append(" set timezone 04\n");
            sb.append("end\n!\nconfig firewall policy\n");
            sb.append(" edit 1\n");
            sb.append("  set name \"CNIP-Internal-Traffic\"\n");
            sb.append("  set srcintf \"port2\"\n");
            sb.append("  set dstintf \"port1\"\n");
            sb.append("  set action accept\n");
            sb.append(" next\nend\n");
        } else {
            sb.append("!\n# Linux / Server Network System Configuration\n");
            sb.append("DEVICE=eth0\nBOOTPROTO=static\nONBOOT=yes\n");
            sb.append("IPADDR=").append(device.getIpAddress()).append("\nNETMASK=255.255.255.0\n");
        }

        sb.append("end\n");
        return sb.toString();
    }

    private String calculateSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "hash-fallback-" + System.currentTimeMillis();
        }
    }
}
