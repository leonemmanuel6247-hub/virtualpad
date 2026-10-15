"""Client sortant : le serveur se connecte au telephone et pilote la manette.

Le telephone heberge un petit serveur TCP. Le Chromebook, lui, se connecte en
sortant, ce qui contourne le filtrage des connexions entrantes de ChromeOS.

Protocole : un message JSON par ligne, termine par '\\n'.
"""

import asyncio
import logging

from gamepad import VirtualGamepad
from protocol import ProtocolError, parse_message

logger = logging.getLogger("virtualpad")

RECONNECT_DELAY_SECONDS = 3.0


async def _handle_connection(host: str, port: int, gamepad: VirtualGamepad) -> None:
    reader, _writer = await asyncio.open_connection(host, port)
    logger.info("Connecte au telephone %s:%d", host, port)
    try:
        while True:
            line = await reader.readline()
            if not line:
                logger.info("Le telephone a ferme la connexion")
                return
            raw = line.decode(errors="replace").strip()
            if not raw:
                continue
            logger.debug("Message recu : %s", raw)
            try:
                event = parse_message(raw)
            except ProtocolError as exc:
                logger.warning("Message rejete : %s", exc)
                continue
            gamepad.apply(event)
    finally:
        # Un appui peut etre en cours au moment de la coupure
        gamepad.release_all()


async def run_client(host: str, port: int) -> None:
    """Se connecte au telephone, et se reconnecte automatiquement en cas de coupure."""
    with VirtualGamepad() as gamepad:
        while True:
            try:
                await _handle_connection(host, port, gamepad)
            except (OSError, asyncio.IncompleteReadError) as exc:
                logger.warning("Connexion perdue (%s). Nouvel essai dans %.0fs", exc, RECONNECT_DELAY_SECONDS)
            await asyncio.sleep(RECONNECT_DELAY_SECONDS)