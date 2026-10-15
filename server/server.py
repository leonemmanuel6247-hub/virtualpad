"""Serveur WebSocket : recoit les commandes du telephone et pilote la manette virtuelle.

Lancement :
    python3 server.py --host 0.0.0.0 --port 8765
"""

import argparse
import asyncio
import logging

import websockets

from gamepad import VirtualGamepad
from protocol import ProtocolError, parse_message

logger = logging.getLogger("virtualpad")


async def handle_client(websocket, gamepad: VirtualGamepad) -> None:
    peer = websocket.remote_address
    logger.info("Client connecte : %s", peer)
    try:
        async for raw in websocket:
            try:
                event = parse_message(raw)
            except ProtocolError as exc:
                logger.warning("Message rejete (%s) : %s", peer, exc)
                await websocket.send('{"type": "error", "message": "invalide"}')
                continue
            gamepad.apply(event)
    except websockets.ConnectionClosed:
        pass
    finally:
        logger.info("Client deconnecte : %s", peer)


async def run(host: str, port: int) -> None:
    with VirtualGamepad() as gamepad:
        async def handler(websocket):
            await handle_client(websocket, gamepad)

        async with websockets.serve(handler, host, port):
            logger.info("Serveur en ecoute sur ws://%s:%d", host, port)
            await asyncio.Future()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serveur manette virtuelle")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(message)s")
    try:
        asyncio.run(run(args.host, args.port))
    except KeyboardInterrupt:
        logger.info("Arret demande")


if __name__ == "__main__":
    main()
