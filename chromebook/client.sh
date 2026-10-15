#!/bin/bash
# Pont entre l'application (manette) et PPSSPP sur le Chromebook.
#
# Le telephone heberge un serveur TCP (mode "Serveur" dans l'application).
# Ce script se connecte en SORTANT vers le telephone, lit chaque ligne
# ("A 1", "UP 0", ...) et envoie l'evenement correspondant a Android via adb,
# que PPSSPP recoit comme des touches/boutons de manette.
#
# Utilisation :
#   ./client.sh 192.168.1.79 8765
#
# Le telephone et le Chromebook doivent etre sur le meme Wi-Fi (pas besoin
# d'internet). Ce script n'utilise ni Python ni aucune dependance.
#
# Ce script a besoin du mode developpeur (adb) sur le Chromebook.

set -u

HOST="${1:?usage: client.sh <ip-du-telephone> <port>}"
PORT="${2:-8765}"

# Correspondance entre les noms envoyes par l'application et les codes Android.
# Pour ajouter un bouton : completer ce tableau, sans rien changer ailleurs.
keycode_for() {
  case "$1" in
    A) echo KEYCODE_BUTTON_A ;;
    B) echo KEYCODE_BUTTON_B ;;
    X) echo KEYCODE_BUTTON_X ;;
    Y) echo KEYCODE_BUTTON_Y ;;
    L1) echo KEYCODE_BUTTON_L1 ;;
    R1) echo KEYCODE_BUTTON_R1 ;;
    START) echo KEYCODE_BUTTON_START ;;
    SELECT) echo KEYCODE_BUTTON_SELECT ;;
    UP) echo KEYCODE_DPAD_UP ;;
    DOWN) echo KEYCODE_DPAD_DOWN ;;
    LEFT) echo KEYCODE_DPAD_LEFT ;;
    RIGHT) echo KEYCODE_DPAD_RIGHT ;;
    *) echo "" ;;
  esac
}

echo "Connexion a ${HOST}:${PORT}..."
exec 3<>"/dev/tcp/${HOST}/${PORT}" || { echo "Echec de connexion"; exit 1; }
echo "Connecte. En attente des commandes (Ctrl+C pour quitter)."

while read -r name state <&3; do
  code="$(keycode_for "$name")"
  if [ -z "$code" ]; then
    continue
  fi
  # 'adb shell input keyevent' envoie deja un appui suivi d'un relachement.
  # On n'agit donc que sur l'appui (state=1) : le relachement (state=0) est
  # ignore pour ne pas produire deux tapes par pression.
  #
  # Limite connue : maintenir un bouton ne le maintient pas cote PPSSPP.
  # Voir la section "Maintien" du README pour une variante si besoin.
  [ "$state" = "1" ] || continue
  adb shell input keyevent "$code" >/dev/null 2>&1
done

echo "Connexion terminee."