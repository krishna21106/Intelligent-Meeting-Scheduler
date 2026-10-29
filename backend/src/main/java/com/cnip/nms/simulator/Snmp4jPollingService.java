package com.cnip.nms.simulator;

import com.cnip.nms.entity.Device;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.snmp4j.CommunityTarget;
import org.snmp4j.PDU;
import org.snmp4j.Snmp;
import org.snmp4j.event.ResponseEvent;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.smi.*;
import org.snmp4j.transport.DefaultUdpTransportMapping;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;

@Service("snmp4jPollingService")
@ConditionalOnProperty(name = "nms.simulator.enabled", havingValue = "false")
public class Snmp4jPollingService implements SnmpPollingService {

    private static final Logger log = LoggerFactory.getLogger(Snmp4jPollingService.class);

    // Standard RFC MIB-2 OIDs
    private static final OID OID_SYS_UPTIME = new OID("1.3.6.1.2.1.1.3.0");
    private static final OID OID_SYS_DESCR = new OID("1.3.6.1.2.1.1.1.0");

    @Override
    public DevicePollResult pollDevice(Device device) {
        long startTime = System.currentTimeMillis();
        try {
            CommunityTarget<Address> target = createTarget(device);
            PDU pdu = new PDU();
            pdu.add(new VariableBinding(OID_SYS_UPTIME));
            pdu.add(new VariableBinding(OID_SYS_DESCR));
            pdu.setType(PDU.GET);

            try (DefaultUdpTransportMapping transport = new DefaultUdpTransportMapping();
                 Snmp snmp = new Snmp(transport)) {
                transport.listen();
                ResponseEvent<Address> response = snmp.send(pdu, target);
                long latency = System.currentTimeMillis() - startTime;

                if (response != null && response.getResponse() != null) {
                    PDU responsePdu = response.getResponse();
                    long uptimeTicks = 0;
                    Variable uptimeVar = responsePdu.getVariable(OID_SYS_UPTIME);
                    if (uptimeVar instanceof TimeTicks ticks) {
                        uptimeTicks = ticks.getValue() / 100; // convert to seconds
                    }

                    return DevicePollResult.builder()
                            .status("UP")
                            .latencyMs((double) latency)
                            .cpuUsage(25.0) // default estimate when OID not vendor specific
                            .memoryUsage(40.0)
                            .packetLossPct(0.0)
                            .bytesInDelta(1048576L)
                            .bytesOutDelta(1048576L)
                            .uptimeSeconds(uptimeTicks)
                            .interfaceData(new ArrayList<>())
                            .build();
                }
            }
        } catch (Exception e) {
            log.warn("Real SNMP poll failed for device {}: {}", device.getIpAddress(), e.getMessage());
        }

        return DevicePollResult.builder()
                .status("DOWN")
                .latencyMs(999.0)
                .cpuUsage(0.0)
                .memoryUsage(0.0)
                .packetLossPct(100.0)
                .bytesInDelta(0L)
                .bytesOutDelta(0L)
                .uptimeSeconds(0L)
                .interfaceData(new ArrayList<>())
                .build();
    }

    @Override
    public boolean testConnection(Device device) {
        try {
            CommunityTarget<Address> target = createTarget(device);
            PDU pdu = new PDU();
            pdu.add(new VariableBinding(OID_SYS_DESCR));
            pdu.setType(PDU.GET);

            try (DefaultUdpTransportMapping transport = new DefaultUdpTransportMapping();
                 Snmp snmp = new Snmp(transport)) {
                transport.listen();
                ResponseEvent<Address> response = snmp.send(pdu, target);
                return response != null && response.getResponse() != null;
            }
        } catch (IOException e) {
            return false;
        }
    }

    private CommunityTarget<Address> createTarget(Device device) {
        Address targetAddress = GenericAddress.parse("udp:" + device.getIpAddress() + "/" + device.getSnmpPort());
        CommunityTarget<Address> target = new CommunityTarget<>();
        target.setCommunity(new OctetString(device.getSnmpCommunity()));
        target.setAddress(targetAddress);
        target.setRetries(2);
        target.setTimeout(1500);
        target.setVersion("v1".equalsIgnoreCase(device.getSnmpVersion()) ? SnmpConstants.version1 : SnmpConstants.version2c);
        return target;
    }
}
