from __future__ import annotations

from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import ALGORITHM

router = APIRouter()

connections: set[WebSocket] = set()
board_state: dict[str, Any] = {
    "selectedMapId": "",
    "placedAvatars": [],
}


def _decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


async def _broadcast(message: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for ws in connections:
        try:
            await ws.send_json(message)
        except RuntimeError:
            dead.append(ws)
    for ws in dead:
        connections.discard(ws)


@router.websocket("/ws/board")
async def board_ws(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    payload = _decode_token(token)
    if not payload or payload.get("role") not in {"USER", "ADMIN"}:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    connections.add(websocket)
    await websocket.send_json({"type": "state", "payload": board_state})

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") != "state":
                continue
            payload = message.get("payload") or {}
            board_state["selectedMapId"] = payload.get("selectedMapId") or ""
            board_state["placedAvatars"] = payload.get("placedAvatars") or []
            await _broadcast({"type": "state", "payload": board_state})
    except WebSocketDisconnect:
        connections.discard(websocket)
