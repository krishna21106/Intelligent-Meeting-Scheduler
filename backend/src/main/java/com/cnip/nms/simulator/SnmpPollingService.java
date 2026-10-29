package com.cnip.nms.simulator;

import com.cnip.nms.entity.Device;

public interface SnmpPollingService {
    DevicePollResult pollDevice(Device device);
    boolean testConnection(Device device);
}

