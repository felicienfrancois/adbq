#!/usr/bin/env node

const { execSync } = require("child_process");
const { downloadAdb, getAdbCommand } = require("./adb-downloader");
const { startQRPairing } = require("./qrcode-pairing");

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : "";

function showHelp() {
  console.log(`
📱 adb-qr CLI

Usage: npx adb-qr [command] [options]

Commands:
  (empty) | qr | qrcode     Start QR code pairing logic and connect to device over WiFi.
  download | update |       Force download of the latest Android platform-tools (ADB).
  upgrade | install         Displays previous and new version numbers.
  help | --help | -h        Show this help message.
  <any adb command>         Executes the raw adb command. (e.g. npx adb-qr devices)
  `);
}

async function main() {
  if (["help", "--help", "-h"].includes(command)) {
    showHelp();
    return;
  }

  if (["download", "update", "upgrade", "install"].includes(command)) {
    await downloadAdb(true, true); // force=true, skipPrompt=true
    return;
  }

  let adbCmd = getAdbCommand();
  if (!adbCmd) {
    adbCmd = await downloadAdb(false, false); // Not forced, ask prompt
  }

  if (["", "qr", "qrcode"].includes(command)) {
    await startQRPairing(adbCmd);
  } else {
    // execute arbitrary ADB command
    try {
      execSync(`${adbCmd} ${args.join(" ")}`, { stdio: "inherit" });
    } catch (e) {
      process.exit(e.status != null ? e.status : 1);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
