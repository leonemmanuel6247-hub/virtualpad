"""Test d'integration du serveur WebSocket, sans materiel.

Un double de la manette remplace uinput, ce qui permet d'executer le test
partout, y compris sur une machine sans /dev/uinput.

Lancement :
    python3 -m unittest test_server_integration -v
"""

import asyncio
import unittest
from dataclasses import dataclass, field

import websockets

import server
from protocol import parse_message


@dataclass
class FakeGamepad:
    """Enregistre les evenements recus a la place du peripherique uinput."""

    events: list = field(default_factory=list)
    released: int = 0

    def apply(self, event) -> None:
        self.events.append(event)

    def release_all(self) -> None:
        self.released += 1


class ServerIntegrationTests(unittest.TestCase):
    def _run(self, coro):
        return asyncio.run(coro)

    def test_les_messages_valides_pilotent_la_manette(self):
        async def scenario():
            gamepad = FakeGamepad()

            async def handler(websocket):
                await server.handle_client(websocket, gamepad)

            async with websockets.serve(handler, "127.0.0.1", 0) as ws_server:
                port = ws_server.sockets[0].getsockname()[1]
                async with websockets.connect(f"ws://127.0.0.1:{port}") as client:
                    await client.send('{"type": "button", "name": "A", "pressed": true}')
                    await client.send('{"type": "dpad", "x": 1, "y": 0}')
                    # Laisse le serveur traiter les deux messages
                    await asyncio.sleep(0.2)

            return gamepad

        gamepad = self._run(scenario())
        self.assertEqual(len(gamepad.events), 2)
        self.assertEqual(gamepad.events[0], parse_message('{"type": "button", "name": "A", "pressed": true}'))
        self.assertEqual(gamepad.events[1], parse_message('{"type": "dpad", "x": 1, "y": 0}'))
        # La deconnexion doit relacher les boutons
        self.assertEqual(gamepad.released, 1)

    def test_message_invalide_renvoie_une_erreur_et_ne_plante_pas(self):
        async def scenario():
            gamepad = FakeGamepad()

            async def handler(websocket):
                await server.handle_client(websocket, gamepad)

            async with websockets.serve(handler, "127.0.0.1", 0) as ws_server:
                port = ws_server.sockets[0].getsockname()[1]
                async with websockets.connect(f"ws://127.0.0.1:{port}") as client:
                    await client.send("pas du json")
                    reply = await asyncio.wait_for(client.recv(), timeout=2)
                    # La connexion reste ouverte pour les messages suivants
                    await client.send('{"type": "button", "name": "B", "pressed": true}')
                    await asyncio.sleep(0.2)

            return gamepad, reply

        gamepad, reply = self._run(scenario())
        self.assertIn("error", reply)
        self.assertEqual(len(gamepad.events), 1)


if __name__ == "__main__":
    unittest.main()