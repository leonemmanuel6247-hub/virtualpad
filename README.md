# VirtualPad

Utilise un telephone Android comme manette pour un PC Linux. Le telephone envoie les
appuis en WebSocket a un serveur Python, qui cree une manette virtuelle Linux (uinput).

## Contenu

```
server/    Serveur Python (WebSocket + uinput)
app/       Application React Native (Expo)
.github/   Workflow GitHub Actions de compilation APK
```

## Serveur (PC Linux)

Le serveur doit tourner sur Linux, qui fournit `/dev/uinput`.

```bash
cd server
python3 -m pip install --user evdev websockets

# Autoriser uinput pour votre utilisateur, puis ouvrir une nouvelle session
sudo groupadd -f -g 258 uinput
sudo usermod -aG uinput $USER
echo 'KERNEL=="uinput", GROUP="uinput", MODE="0660"' | sudo tee /etc/udev/rules.d/99-uinput.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# Lancer le serveur
python3 server.py --port 8765
```

Trouver l'adresse IP du PC : `hostname -I`.

## Application

Installer l'APK depuis l'artefact `virtualpad-apk` de l'onglet Actions, puis saisir
l'adresse IP et le port du serveur (par exemple `192.168.1.77` et `8765`).

Boutons : A, B, X, Y, START, SELECT, L1, R1 et la croix directionnelle.

## Verifier cote PC

```bash
sudo evtest   # choisir "VirtualPad"
```

## Tests du protocole

```bash
cd server
python3 -m unittest test_protocol -v
```

## Recompiler l'APK

Le workflow `.github/workflows/build-apk.yml` compile l'APK a chaque push sur `master`,
et peut etre lance a la main depuis l'onglet Actions.

## Limites connues

- Aucune authentification : toute machine du reseau local peut envoyer des commandes.
  Ne pas utiliser sur un reseau public.
- Le serveur utilise `evdev` et `/dev/uinput` : Linux uniquement.
- Sur ChromeOS, les connexions entrantes vers un chroot crouton sont filtrees. Utiliser
  un PC Linux comme serveur, ou un tunnel USB (`adb reverse`).
- L'APK est signe avec la cle de debug.