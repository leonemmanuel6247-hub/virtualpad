# VirtualPad

Utilise un telephone Android comme manette pour un PC Linux. Le telephone envoie les
appuis en WebSocket a un serveur Python, qui cree une manette virtuelle Linux (uinput).

## Contenu

```
server/    Serveur Python (WebSocket + uinput)
app/       Application React Native (Expo)
.github/   Workflow GitHub Actions de compilation APK
```

## Principe

La manette virtuelle doit etre creee sur un PC Linux, qui fournit `/dev/uinput`
(une application Android ne peut pas injecter de manette sur le Chromebook).

Sur ChromeOS, les connexions **entrantes** vers le chroot sont filtrees. On inverse
donc le sens : **le telephone heberge, le PC se connecte en sortant**. Cela fonctionne
sur Wi-Fi, sans USB ni adb.

- Mode `host` : le telephone ouvre un serveur TCP (recommande sur ChromeOS).
- Mode `connect` : le telephone se connecte a un serveur WebSocket (reseau ouvert).

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
```

Trouver l'adresse IP du PC : `hostname -I`.

## Utilisation (Wi-Fi)

1. Dans l'application, choisir **Heberger**, saisir le port (8765), puis **Demarrer**.
2. Sur le PC, lancer le serveur en mode sortant vers l'IP du telephone :

```bash
python3 server.py connect --host <IP-du-telephone> --port 8765
```

L'adresse IP du telephone s'affiche sur le telephone (Parametres > Wi-Fi).

Boutons : A, B, X, Y, START, SELECT, L1, R1 et la croix directionnelle.

## Mode alternatif (reseau ouvert)

Si le PC heberge lui-meme, en mode WebSocket, et que le telephone peut l'atteindre :

```bash
python3 server.py listen --host 0.0.0.0 --port 8765
```

Puis dans l'application, choisir **Se connecter** et saisir l'IP du PC.

## Verifier cote PC

```bash
sudo evtest   # choisir "VirtualPad"
```

## Diagnostic

Le serveur affiche chaque etape. Pour voir les messages recus, relancer avec `--log-level DEBUG` :

```bash
python3 server.py connect --host <IP-du-telephone> --port 8765 --log-level DEBUG
```

L'application journalise tout sous le tag `VirtualPad`. Deux facons de le lire :

1. Bouton **Journal** dans l'application (affiche les evenements a l'ecran).
2. Depuis le PC, via USB :

```bash
adb logcat ReactNativeJS:V *:S | grep VirtualPad
```

Le journal indique l'URL tentee, l'ouverture ou l'echec de la socket, le code de
fermeture, et chaque appui envoye.

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
- Sur ChromeOS, les connexions entrantes vers un chroot crouton sont filtrees : utiliser
  le mode `connect` (le PC sort vers le telephone).
- La version Android ne peut pas injecter de manette : le PC Linux reste necessaire.
- L'APK est signe avec la cle de debug.