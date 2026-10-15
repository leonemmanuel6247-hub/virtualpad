"""Point d'entree : recoit les commandes du telephone et pilote la manette virtuelle.

Deux modes :

    # Mode connect (recommande sur ChromeOS) : le PC se connecte en SORTANT au
    # telephone, qui heberge un serveur TCP. Contourne le filtrage des connexions
    # entrantes de ChromeOS.
    python3 server.py connect --host 192.168.1.79 --port 8765

    # Mode listen (classique) : le PC heberge un serveur WebSocket.
    python3 server.py listen --host 0.0.0.0 --port 8765
"""

import argparse
import asyncio
import logging

import websockets

from client import run_client
from gamepad import VirtualGamepad
from protocol import ProtocolError, parse_message

logger = logging.getLogger("virtualpad")


async def handle_client(websocket, gamepad: VirtualGamepad) -> None:
    peer = websocket.remote_address
    logger.info("Client connecte : %s", peer)
    try:
        async for raw in websocket:
            logger.debug("Message recu (%s) : %s", peer, raw)
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
        # Evite qu'un bouton reste enfonce si le client coupe en cours d'appui
        gamepad.release_all()
        logger.info("Client deconnecte : %s", peer)


async def run_listen(host: str, port: int) -> None:
    with VirtualGamepad() as gamepad:
        async def handler(websocket):
            await handle_client(websocket, gamepad)

        async with websockets.serve(handler, host, port):
            logger.info("Serveur en ecoute sur ws://%s:%d", host, port)
            await asyncio.Future()


def main() -> None:
    parser = argparse.ArgumentParser(description="Manette virtuelle")
    sub = parser.add_subparsers(dest="mode", required=True)

    connect = sub.add_parser("connect", help="se connecter au telephone (sortant)")
    connect.add_argument("--host", required=True, help="adresse du telephone")
    connect.add_argument("--port", type=int, default=8765)

    listen = sub.add_parser("listen", help="heberger un serveur WebSocket")
    listen.add_argument("--host", default="0.0.0.0")
    listen.add_argument("--port", type=int, default=8765)

    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(message)s")
    try:
        if args.mode == "connect":
            asyncio.run(run_client(args.host, args.port))
        else:
            asyncio.run(run_listen(args.host, args.port))
    except KeyboardInterrupt:
        logger.info("Arret demande")


if __name__ == "__main__":
    main()