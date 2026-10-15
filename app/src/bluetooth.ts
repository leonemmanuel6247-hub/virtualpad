import BluetoothHid, { BondedDevice } from "../modules/bluetooth-hid";
import { log } from "./logger";
import type { ButtonName, ControlName, DpadDirection } from "./protocol";

function module() {
  return BluetoothHid.getBluetoothHid();
}

// Etat du D-pad, pour envoyer l'etat complet a chaque changement
const dpadState: Record<DpadDirection, boolean> = {
  UP: false,
  DOWN: false,
  LEFT: false,
  RIGHT: false,
};

/**
 * Envoie une commande via la manette Bluetooth HID.
 * Seuls les boutons et le D-pad sont geres par le descripteur HID actuel.
 */
export function sendBluetooth(name: ControlName, pressed: boolean): void {
  try {
    if (name === "UP" || name === "DOWN" || name === "LEFT" || name === "RIGHT") {
      dpadState[name] = pressed;
      module().sendDpad(dpadState.UP, dpadState.DOWN, dpadState.LEFT, dpadState.RIGHT);
      return;
    }
    module().sendButton(name as ButtonName, pressed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`envoi Bluetooth impossible : ${message}`);
  }
}

export function startBluetooth(): void {
  module()
    .start()
    .then(() => log("manette Bluetooth enregistree, apparie-la depuis le Chromebook"))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`echec Bluetooth : ${message}`);
    });
}

export function stopBluetooth(): void {
  module()
    .stop()
    .then(() => log("manette Bluetooth arretee"))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`echec arret Bluetooth : ${message}`);
    });
}

export function bluetoothConnected(): boolean {
  try {
    return module().isConnected();
  } catch {
    return false;
  }
}

export function listBondedDevices(): BondedDevice[] {
  try {
    return module().listBondedDevices();
  } catch {
    return [];
  }
}

export function connectBluetooth(address: string): Promise<boolean> {
  return module().connect(address);
}