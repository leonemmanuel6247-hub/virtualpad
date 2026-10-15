"""Protocole entre l'application mobile et le serveur.

Message attendu (JSON) :
    {"type": "button", "name": "A", "pressed": true}
    {"type": "dpad", "x": -1, "y": 0}

Les noms de boutons correspondent a BUTTON_MAP.
"""

import json
from dataclasses import dataclass
from typing import Union

# Noms de boutons acceptes. La traduction vers les codes evdev est faite dans gamepad.py
BUTTON_NAMES = frozenset({"A", "B", "X", "Y", "START", "SELECT", "L1", "R1"})

# Valeurs autorisees pour chaque axe du D-pad
DPAD_AXES = (-1, 0, 1)


class ProtocolError(ValueError):
    """Message invalide, recu depuis le client."""


def _is_dpad_value(value: object) -> bool:
    # bool est un sous-type de int : on l'exclut explicitement
    return type(value) is int and value in DPAD_AXES


@dataclass(frozen=True)
class ButtonEvent:
    name: str
    pressed: bool


@dataclass(frozen=True)
class DpadEvent:
    x: int
    y: int


Event = Union[ButtonEvent, DpadEvent]


def parse_message(raw: str) -> Event:
    """Valide un message JSON et le convertit en evenement typé."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ProtocolError(f"JSON invalide : {exc}") from exc

    if not isinstance(data, dict):
        raise ProtocolError("le message doit etre un objet JSON")

    message_type = data.get("type")

    if message_type == "button":
        name = data.get("name")
        pressed = data.get("pressed")
        if name not in BUTTON_NAMES:
            raise ProtocolError(f"bouton inconnu : {name!r}")
        if not isinstance(pressed, bool):
            raise ProtocolError("'pressed' doit etre un booleen")
        return ButtonEvent(name=name, pressed=pressed)

    if message_type == "dpad":
        x = data.get("x")
        y = data.get("y")
        if not _is_dpad_value(x) or not _is_dpad_value(y):
            raise ProtocolError("'x' et 'y' doivent valoir -1, 0 ou 1")
        return DpadEvent(x=x, y=y)

    raise ProtocolError(f"type de message inconnu : {message_type!r}")
