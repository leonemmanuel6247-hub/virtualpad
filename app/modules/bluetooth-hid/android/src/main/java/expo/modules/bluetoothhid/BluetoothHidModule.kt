package expo.modules.bluetoothhid

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHidDevice
import android.bluetooth.BluetoothHidDeviceAppSdpSettings
import android.bluetooth.BluetoothProfile
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors

/**
 * Enregistre le telephone comme manette Bluetooth (HID).
 *
 * Le PC le voit comme un vrai controleur, et PPSSPP le lit directement.
 * Ne necessite ni application ni terminal cote PC, ni connexion internet.
 *
 * Limite : l'appairage doit etre fait depuis les reglages Bluetooth du PC.
 * L'API Android ne permet pas de forcer l'appairage programmatiquement.
 */
class BluetoothHidModule : Module() {

  private var hidDevice: BluetoothHidDevice? = null
  private var connectedDevice: BluetoothDevice? = null
  private val executor = Executors.newSingleThreadExecutor()
  private var currentButtons = 0
  private var currentHat = NEUTRAL_HAT

  private val adapter: BluetoothAdapter?
    get() = BluetoothAdapter.getDefaultAdapter()

  private val serviceListener = object : BluetoothProfile.ServiceListener {
    override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
      if (profile != BluetoothProfile.HID_DEVICE) return
      val device = proxy as BluetoothHidDevice
      hidDevice = device
      val sdp = BluetoothHidDeviceAppSdpSettings(
        "VirtualPad",
        "Manette virtuelle",
        "MonkeyCode",
        BluetoothHidDevice.SUBCLASS1_COMBO,
        GAMEPAD_REPORT_DESCRIPTOR,
      )
      device.registerApp(sdp, null, null, executor, callback)
    }

    override fun onServiceDisconnected(profile: Int) {
      if (profile != BluetoothProfile.HID_DEVICE) return
      hidDevice = null
      connectedDevice = null
    }
  }

  private val callback = object : BluetoothHidDevice.Callback() {
    override fun onConnectionStateChanged(device: BluetoothDevice, state: Int) {
      when (state) {
        BluetoothProfile.STATE_CONNECTED -> connectedDevice = device
        BluetoothProfile.STATE_DISCONNECTED -> {
          if (connectedDevice == device) connectedDevice = null
        }
      }
    }
  }

  private fun hasConnectPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val context = appContext.reactContext ?: return false
    return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
      PackageManager.PERMISSION_GRANTED
  }

  override fun definition() = ModuleDefinition {
    Name("BluetoothHid")

    // Demande a Android d'ouvrir le profil HID. Ne fait pas l'appairage.
    AsyncFunction("start") { promise: Promise ->
      val context = appContext.reactContext
      val bluetooth = adapter
      if (context == null) {
        promise.reject("no_context", "Contexte Android indisponible", null)
        return@AsyncFunction
      }
      if (bluetooth == null || !bluetooth.isEnabled) {
        promise.reject("bluetooth_off", "Bluetooth desactive", null)
        return@AsyncFunction
      }
      if (!hasConnectPermission()) {
        promise.reject("permission", "Permission BLUETOOTH_CONNECT manquante", null)
        return@AsyncFunction
      }
      val opened = bluetooth.getProfileProxy(context, serviceListener, BluetoothProfile.HID_DEVICE)
      if (opened) {
        promise.resolve(null)
      } else {
        promise.reject("proxy_failed", "Impossible d'ouvrir le profil HID", null)
      }
    }

    // Liste les appareils appaires : le PC doit y apparaitre apres appairage.
    Function("listBondedDevices") {
      if (!hasConnectPermission()) {
        return@Function emptyList<Map<String, String>>()
      }
      adapter?.bondedDevices?.map { mapOf("name" to (it.name ?: "?"), "address" to it.address) }
        ?: emptyList<Map<String, String>>()
    }

    // Connecte la manette a un appareil appaire, par adresse MAC.
    AsyncFunction("connect") { address: String, promise: Promise ->
      val hid = hidDevice
      if (hid == null) {
        promise.reject("not_started", "Appeler start() d'abord", null)
        return@AsyncFunction
      }
      if (!hasConnectPermission()) {
        promise.reject("permission", "Permission BLUETOOTH_CONNECT manquante", null)
        return@AsyncFunction
      }
      val device = adapter?.bondedDevices?.firstOrNull { it.address.equals(address, ignoreCase = true) }
      if (device == null) {
        promise.reject("not_bonded", "Appareil non appaire : $address", null)
        return@AsyncFunction
      }
      promise.resolve(hid.connect(device))
    }

    Function("isConnected") { connectedDevice != null }

    // Envoie un appui de bouton. name = A/B/X/Y/L1/R1/START/SELECT.
    Function("sendButton") { name: String, pressed: Boolean ->
      currentButtons = maskFor(name, pressed)
      sendReport()
    }

    // Envoie l'etat complet du D-pad, ce qui gere les diagonales.
    Function("sendDpad") { up: Boolean, down: Boolean, left: Boolean, right: Boolean ->
      currentHat = hatFrom(up, down, left, right)
      sendReport()
    }

    AsyncFunction("stop") { promise: Promise ->
      val context = appContext.reactContext
      val bluetooth = adapter
      val hid = hidDevice
      if (context != null && bluetooth != null && hid != null) {
        hid.unregisterApp()
        bluetooth.closeProfileProxy(BluetoothProfile.HID_DEVICE, hid)
      }
      hidDevice = null
      connectedDevice = null
      currentButtons = 0
      currentHat = NEUTRAL_HAT
      promise.resolve(null)
    }
  }

  private fun maskFor(name: String, pressed: Boolean): Int {
    val bit = when (name) {
      "A" -> 1 shl 0
      "B" -> 1 shl 1
      "X" -> 1 shl 2
      "Y" -> 1 shl 3
      "L1" -> 1 shl 4
      "R1" -> 1 shl 5
      "SELECT" -> 1 shl 6
      "START" -> 1 shl 7
      else -> 0
    }
    return if (pressed) currentButtons or bit else currentButtons and bit.inv()
  }

  // Chapeau HID : 0=haut, sens horaire jusqu'a 7, 0x0F=neutre.
  private fun hatFrom(up: Boolean, down: Boolean, left: Boolean, right: Boolean): Int {
    val vertical = if (up && !down) -1 else if (down && !up) 1 else 0
    val horizontal = if (left && !right) -1 else if (right && !left) 1 else 0
    return when {
      vertical == -1 && horizontal == 0 -> 0
      vertical == -1 && horizontal == 1 -> 1
      vertical == 0 && horizontal == 1 -> 2
      vertical == 1 && horizontal == 1 -> 3
      vertical == 1 && horizontal == 0 -> 4
      vertical == 1 && horizontal == -1 -> 5
      vertical == 0 && horizontal == -1 -> 6
      vertical == -1 && horizontal == -1 -> 7
      else -> NEUTRAL_HAT
    }
  }

  private fun sendReport() {
    val hid = hidDevice ?: return
    val device = connectedDevice ?: return
    val report = byteArrayOf(
      currentButtons.toByte(),
      currentHat.toByte(),
      0, 0, 0, 0,
    )
    try {
      hid.sendReport(device, REPORT_ID, report)
    } catch (error: SecurityException) {
      // Permission revoquee : ignore, l'etat se verra deconnecte cote app
    }
  }

  companion object {
    private const val REPORT_ID: Int = 0x01
    private const val NEUTRAL_HAT: Int = 0x0F

    // Descripteur HID : 8 boutons, un chapeau, 4 axes (inutilises mais declares).
    private val GAMEPAD_REPORT_DESCRIPTOR = byteArrayOf(
      0x05, 0x01, // Usage Page (Generic Desktop)
      0x09, 0x05, // Usage (Game Pad)
      0xA1.toByte(), 0x01, // Collection (Application)
      0x85.toByte(), 0x01, //   Report ID (1)
      0x05, 0x09, //   Usage Page (Button)
      0x19, 0x01, //   Usage Minimum (1)
      0x29, 0x08, //   Usage Maximum (8)
      0x15, 0x00, //   Logical Minimum (0)
      0x25, 0x01, //   Logical Maximum (1)
      0x75, 0x01, //   Report Size (1)
      0x95.toByte(), 0x08, //   Report Count (8)
      0x81.toByte(), 0x02, //   Input (Data, Var, Abs)
      0x05, 0x01, //   Usage Page (Generic Desktop)
      0x09, 0x39, //   Usage (Hat switch)
      0x15, 0x00, //   Logical Minimum (0)
      0x25, 0x07, //   Logical Maximum (7)
      0x35, 0x00, //   Physical Minimum (0)
      0x46, 0x3B, 0x01, //   Physical Maximum (315)
      0x65, 0x14, //   Unit (Eng Rot: Degree)
      0x75, 0x04, //   Report Size (4)
      0x95.toByte(), 0x01, //   Report Count (1)
      0x81.toByte(), 0x42, //   Input (Data, Var, Abs, Null State)
      0x65, 0x00, //   Unit (None)
      0x75, 0x04, //   Report Size (4)
      0x95.toByte(), 0x01, //   Report Count (1)
      0x81.toByte(), 0x01, //   Input (Const)
      0x09, 0x30, //   Usage (X)
      0x09, 0x31, //   Usage (Y)
      0x09, 0x32, //   Usage (Z)
      0x09, 0x35, //   Usage (Rz)
      0x15, 0x81.toByte(), //   Logical Minimum (-127)
      0x25, 0x7F, //   Logical Maximum (127)
      0x75, 0x08, //   Report Size (8)
      0x95.toByte(), 0x04, //   Report Count (4)
      0x81.toByte(), 0x02, //   Input (Data, Var, Abs)
      0xC0.toByte(), // End Collection
    )
  }
}