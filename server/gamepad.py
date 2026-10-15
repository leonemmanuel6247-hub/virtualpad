"""Manette virtuelle Linux (uinput) pilotee par les evenements du protocole."""

from evdev import AbsInfo, UInput
from evdev import ecodes as e

from protocol import ButtonEvent, DpadEvent, Event

# Traduction des noms du protocole vers les codes evdev
BUTTON_CODES = {
    "A": e.BTN_SOUTH,
    "B": e.BTN_EAST,
    "X": e.BTN_NORTH,
    "Y": e.BTN_WEST,
    "START": e.BTN_START,
    "SELECT": e.BTN_SELECT,
    "L1": e.BTN_TL,
    "R1": e.BTN_TR,
}

_DPAD_INFO = AbsInfo(value=0, min=-1, max=1, fuzz=0, flat=0, resolution=0)


def _build_capabilities() -> dict:
    return {
        e.EV_KEY: list(BUTTON_CODES.values()),
        e.EV_ABS: [
            (e.ABS_HAT0X, _DPAD_INFO),
            (e.ABS_HAT0Y, _DPAD_INFO),
        ],
    }


class VirtualGamepad:
    """Envoie les evenements de boutons et de D-pad vers le peripherique virtuel."""

    def __init__(self, name: str = "VirtualPad") -> None:
        self._device = UInput(_build_capabilities(), name=name)
        self._pressed: set[str] = set()

    def apply(self, event: Event) -> None:
        if isinstance(event, ButtonEvent):
            self._apply_button(event)
        elif isinstance(event, DpadEvent):
            self._apply_dpad(event)

    def _apply_button(self, event: ButtonEvent) -> None:
        if event.pressed:
            self._pressed.add(event.name)
        else:
            self._pressed.discard(event.name)
        self._device.write(e.EV_KEY, BUTTON_CODES[event.name], int(event.pressed))
        self._device.syn()

    def _apply_dpad(self, event: DpadEvent) -> None:
        self._device.write(e.EV_ABS, e.ABS_HAT0X, event.x)
        self._device.write(e.EV_ABS, e.ABS_HAT0Y, event.y)
        self._device.syn()

    def release_all(self) -> None:
        """Relache tout ce qui est encore enfonce (utilise a la deconnexion).

        Sans cela, un bouton maintenu au moment de la deconnexion reste
        enfonce cote systeme.
        """
        for name in list(self._pressed):
            self._device.write(e.EV_KEY, BUTTON_CODES[name], 0)
        self._device.write(e.EV_ABS, e.ABS_HAT0X, 0)
        self._device.write(e.EV_ABS, e.ABS_HAT0Y, 0)
        self._device.syn()
        self._pressed.clear()

    def close(self) -> None:
        self._device.close()

    def __enter__(self) -> "VirtualGamepad":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()