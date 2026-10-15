// Protocole texte minimal, une ligne par appui : "<NOM> <etat>\n"
// Exemples : "A 1\n" (appui), "A 0\n" (relache), "UP 1\n", "DOWN 0\n"
//
// Ce format est volontairement simple pour etre lu par un petit script bash
// cote PC (lecture ligne par ligne via /dev/tcp).

export type ButtonName = "A" | "B" | "X" | "Y" | "START" | "SELECT" | "L1" | "R1";
export type DpadDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type ControlName = ButtonName | DpadDirection;

export function encodeControl(name: ControlName, pressed: boolean): string {
  return `${name} ${pressed ? 1 : 0}\n`;
}