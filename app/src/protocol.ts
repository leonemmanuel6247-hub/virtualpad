// Messages envoyes au serveur Python (voir server/protocol.py)

export type ButtonName = "A" | "B" | "X" | "Y" | "START" | "SELECT" | "L1" | "R1";

export type DpadValue = -1 | 0 | 1;

export interface ButtonMessage {
  type: "button";
  name: ButtonName;
  pressed: boolean;
}

export interface DpadMessage {
  type: "dpad";
  x: DpadValue;
  y: DpadValue;
}

export type GamepadMessage = ButtonMessage | DpadMessage;

export function buttonMessage(name: ButtonName, pressed: boolean): ButtonMessage {
  return { type: "button", name, pressed };
}

export function dpadMessage(x: DpadValue, y: DpadValue): DpadMessage {
  return { type: "dpad", x, y };
}
