# adbq

**A zero-configuration, frictionless Wireless Android Debug Bridge (ADB) connector directly in your terminal.**

`adbq` serves two primary purposes:

1. **Frictionless QR Code Connection:** Dramatically simplify connecting to Android 11+ devices wirelessly. Run the command, scan the QR code generated in your terminal from your phone's Developer Options, and `adbq` handles the rest (mDNS discovery, pairing, connecting, and duplicate device cleanup automatically).
2. **Universal ADB Proxy:** Never worry about installing the Android SDK or `platform-tools` manually again. `adbq` acts as a direct proxy for all standard `adb` commands. If `adb` isn't installed locally or in your PATH, it will intelligently download the correct binaries for Windows, macOS, or Linux automatically.

## Quick Start (Zero Install)

Just run `adbq` via `npx` anywhere on your machine—no global setup required!

```sh
npx adbq
```

### 📱 1. Frictionless Wireless Pairing (QR Code)

Run the script without arguments (or with the `qr` keyword) to enter frictionless pairing mode:

```sh
npx adbq qr
```

**How to pair:**

1. Open your Android Settings > **Developer Options**.
2. Scroll to and tap **Wireless Debugging** to enable it.
3. Tap **Pair device with QR code**.
4. Scan the QR code rendered directly inside your terminal window!

_The bridging happens entirely in the background. The script auto-discovers your phone via mDNS, manages the pairing credentials securely, connects your device, and isolates the active IP connection automatically._

### 🚀 2. Drop-in ADB Proxy

`adbq` completely wraps the standard ADB binary. You can append _any_ standard ADB command directly to `adbq`, and it will pass it through elegantly!

```sh
# Examples:
npx adbq devices
npx adbq logcat
npx adbq shell
npx adbq install ./my-app.apk
npx adbq tcpip 5555
```

✨ **Automated Download**: If you run a proxy command and ADB isn't on your machine, `adbq` will prompt you to safely and quickly download the latest official `platform-tools` release from Google for your operating system automatically before running the command.

### 🔄 3. Force Update / Install ADB

You can instruct `adbq` to forcefully download or update the underlying `platform-tools` binaries. It will compare versions and report the upgrade!

```sh
npx adbq update
```

_(Aliases: `download`, `upgrade`, `install`)_

---

### Help Menu

Display the help menu:

```sh
npx adbq help
```
