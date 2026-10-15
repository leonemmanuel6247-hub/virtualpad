import { requireNativeModule } from "expo-modules-core";

export interface BondedDevice {
  name: string;
  address: string;
}

interface BluetoothHidModule {
  start(): Promise<void>;
  stop(): Promise<void>;
  connect(address: string): Promise<boolean>;
  listBondedDevices(): BondedDevice[];
  isConnected(): boolean;
  sendButton(name: string, pressed: boolean): void;
  sendDpad(up: boolean, down: boolean, left: boolean, right: boolean): void;
}

// Le module natif n'existe pas dans Expo Go. On l'expose via une fonction
// pour eviter un plantage a l'import si le module est absent.
let cached: BluetoothHidModule | null = null;

export function getBluetoothHid(): BluetoothHidModule {
  if (cached === null) {
    cached = requireNativeModule<BluetoothHidModule>("BluetoothHid");
  }
  return cached;
}

export default { getBluetoothHid };