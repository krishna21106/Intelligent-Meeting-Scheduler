import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # router_id -> set of WebSockets
        self.packet_connections: Dict[int, Set[WebSocket]] = {}
        # set of WebSockets listening for alerts
        self.alert_connections: Set[WebSocket] = set()

    async def connect_packet(self, websocket: WebSocket, router_id: int):
        await websocket.accept()
        if router_id not in self.packet_connections:
            self.packet_connections[router_id] = set()
        self.packet_connections[router_id].add(websocket)

    def disconnect_packet(self, websocket: WebSocket, router_id: int):
        if router_id in self.packet_connections:
            self.packet_connections[router_id].discard(websocket)
            if not self.packet_connections[router_id]:
                del self.packet_connections[router_id]

    async def broadcast_packet(self, router_id: int, packet_data: dict):
        if router_id in self.packet_connections:
            dead_sockets = set()
            for ws in list(self.packet_connections[router_id]):
                try:
                    await ws.send_text(json.dumps(packet_data))
                except Exception:
                    dead_sockets.add(ws)
            for dead in dead_sockets:
                self.disconnect_packet(dead, router_id)

    async def connect_alert(self, websocket: WebSocket):
        await websocket.accept()
        self.alert_connections.add(websocket)

    def disconnect_alert(self, websocket: WebSocket):
        self.alert_connections.discard(websocket)

    async def broadcast_alert(self, alert_data: dict):
        dead_sockets = set()
        for ws in list(self.alert_connections):
            try:
                await ws.send_text(json.dumps(alert_data))
            except Exception:
                dead_sockets.add(ws)
        for dead in dead_sockets:
            self.alert_connections.discard(dead)

ws_manager = ConnectionManager()
