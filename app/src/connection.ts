import { log } from "./logger";
import type { GamepadMessage } from "./protocol";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface GamepadConnection {
  send(message: GamepadMessage): void;
  close(): void;
}

/**
 * Ouvre une connexion WebSocket vers le serveur.
 * Les messages envoyes pendant une deconnexion sont ignores (pas de file d'attente :
 * un appui rejoue apres reconnexion serait dangereux).
 */
export function connectToServer(
  url: string,
  onStatus: (status: ConnectionStatus, detail?: string) => void,
): GamepadConnection {
  log(`connexion vers ${url}`);
  onStatus("connecting");
  const socket = new WebSocket(url);
  let isOpen = false;

  socket.onopen = () => {
    isOpen = true;
    log("socket ouverte");
    onStatus("connected");
  };
  socket.onclose = (event) => {
    isOpen = false;
    log(`socket fermee (code ${event.code}, raison "${event.reason}")`);
    // Le code 1000 est une fermeture normale demandee par l'application
    if (event.code === 1000) {
      onStatus("disconnected");
    } else {
      onStatus("error", `connexion fermee (code ${event.code})`);
    }
  };
  socket.onerror = (event) => {
    const message = (event as { message?: string }).message;
    log(`erreur socket : ${message ?? "sans message"} (verifier IP, port, tunnel adb)`);
    onStatus("error", message ?? "serveur injoignable");
  };
  socket.onmessage = (event) => {
    log(`message du serveur : ${String(event.data)}`);
  };

  return {
    send(message) {
      if (isOpen) {
        socket.send(JSON.stringify(message));
      } else {
        log(`appui ignore (socket non ouverte) : ${JSON.stringify(message)}`);
      }
    },
    close() {
      log("fermeture demandee");
      socket.close();
    },
  };
}