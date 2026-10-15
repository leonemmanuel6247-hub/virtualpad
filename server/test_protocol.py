"""Tests unitaires du protocole (sans acces a uinput)."""

import unittest

from protocol import ButtonEvent, DpadEvent, ProtocolError, parse_message


class ParseButtonTests(unittest.TestCase):
    def test_bouton_valide(self):
        event = parse_message('{"type": "button", "name": "A", "pressed": true}')
        self.assertEqual(event, ButtonEvent(name="A", pressed=True))

    def test_bouton_inconnu(self):
        with self.assertRaises(ProtocolError):
            parse_message('{"type": "button", "name": "Z", "pressed": true}')

    def test_pressed_non_booleen(self):
        with self.assertRaises(ProtocolError):
            parse_message('{"type": "button", "name": "A", "pressed": 1}')

    def test_champ_manquant(self):
        with self.assertRaises(ProtocolError):
            parse_message('{"type": "button", "name": "A"}')


class ParseDpadTests(unittest.TestCase):
    def test_dpad_valide(self):
        event = parse_message('{"type": "dpad", "x": -1, "y": 1}')
        self.assertEqual(event, DpadEvent(x=-1, y=1))

    def test_valeur_hors_limite(self):
        with self.assertRaises(ProtocolError):
            parse_message('{"type": "dpad", "x": 2, "y": 0}')

    def test_valeur_booleenne_refusee_en_tant_qu_entier(self):
        # True == 1 en Python : on refuse explicitement les booleens
        with self.assertRaises(ProtocolError):
            parse_message('{"type": "dpad", "x": true, "y": 0}')


class ParseGeneralTests(unittest.TestCase):
    def test_json_invalide(self):
        with self.assertRaises(ProtocolError):
            parse_message("pas du json")

    def test_pas_un_objet(self):
        with self.assertRaises(ProtocolError):
            parse_message("[1, 2, 3]")

    def test_type_inconnu(self):
        with self.assertRaises(ProtocolError):
            parse_message('{"type": "rumble"}')


if __name__ == "__main__":
    unittest.main()
