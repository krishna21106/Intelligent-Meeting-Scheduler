package com.cnip.nms.service;

import com.cnip.nms.dto.DeviceCreateUpdateDto;
import com.cnip.nms.dto.DeviceDto;
import com.cnip.nms.entity.Device;
import com.cnip.nms.exception.BadRequestException;
import com.cnip.nms.repository.DeviceRepository;
import com.cnip.nms.repository.InterfaceRepository;
import com.cnip.nms.repository.MetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DeviceServiceTest {

    @Mock
    private DeviceRepository deviceRepository;

    @Mock
    private InterfaceRepository interfaceRepository;

    @Mock
    private MetricRepository metricRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private DeviceService deviceService;

    private Device sampleDevice;

    @BeforeEach
    void setUp() {
        sampleDevice = Device.builder()
                .id(1L)
                .name("test-router-01")
                .ipAddress("10.0.0.1")
                .deviceType("ROUTER")
                .vendor("Cisco")
                .model("Catalyst 8500")
                .site("HQ - New York")
                .status("UP")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testCreateDeviceSuccess() {
        DeviceCreateUpdateDto dto = DeviceCreateUpdateDto.builder()
                .name("test-router-01")
                .ipAddress("10.0.0.1")
                .deviceType("ROUTER")
                .vendor("Cisco")
                .model("Catalyst 8500")
                .site("HQ - New York")
                .build();

        when(deviceRepository.existsByName("test-router-01")).thenReturn(false);
        when(deviceRepository.existsByIpAddress("10.0.0.1")).thenReturn(false);
        when(deviceRepository.save(any(Device.class))).thenReturn(sampleDevice);
        when(deviceRepository.findById(1L)).thenReturn(Optional.of(sampleDevice));
        when(interfaceRepository.findByDeviceId(1L)).thenReturn(Collections.emptyList());

        DeviceDto result = deviceService.createDevice(dto);

        assertNotNull(result);
        assertEquals("test-router-01", result.getName());
        assertEquals("10.0.0.1", result.getIpAddress());
        verify(deviceRepository).save(any(Device.class));
    }

    @Test
    void testCreateDeviceDuplicateNameThrowsException() {
        DeviceCreateUpdateDto dto = DeviceCreateUpdateDto.builder()
                .name("test-router-01")
                .ipAddress("10.0.0.2")
                .deviceType("ROUTER")
                .vendor("Cisco")
                .model("Catalyst 8500")
                .site("HQ - New York")
                .build();

        when(deviceRepository.existsByName("test-router-01")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> deviceService.createDevice(dto));
        verify(deviceRepository, never()).save(any(Device.class));
    }
}
