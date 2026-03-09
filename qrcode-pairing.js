const { execSync } = require("child_process");
const readline = require("readline");
const qrcode = require("qrcode-terminal");

function generateString(length) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

function generateName() {
  return `${generateString(14)}-${generateString(6)}`;
}

function generatePassword() {
  return generateString(21);
}

const name = `ADB_WIFI_${generateName()}`;
const password = generatePassword();

function showQR() {
  const qrText = `WIFI:T:ADB;S:${name};P:${password};;`;
  qrcode.generate(qrText, { small: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startDiscover(adbCmd) {
  console.log("🔍 Searching for ADB devices and waiting for scan qrcode...");
  let prevNumLines = 0;

  while (true) {
    let deviceNearby = "";
    try {
      deviceNearby = execSync(`${adbCmd} mdns services`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch (e) {
      deviceNearby = "";
    }

    // Clear previous output
    for (let i = 0; i < prevNumLines; i++) {
      readline.moveCursor(process.stdout, 0, -1);
      readline.clearLine(process.stdout, 0);
    }

    const printStr = `device_nearby:\n${deviceNearby || "(no devices found)"}`;
    console.log(printStr);
    prevNumLines = printStr.split("\n").length;

    const lines = deviceNearby.split("\n");
    const match = lines.find((line) => line.includes("_adb-tls-pairing._tcp"));

    if (match) {
      const parts = match.trim().split(/\s+/);
      const addressPort = parts.find(
        (p) => p.includes(":") && !p.includes("_adb"),
      );

      if (addressPort) {
        const sepIndex = addressPort.lastIndexOf(":");
        const ip = addressPort.substring(0, sepIndex);
        const pairPort = addressPort.substring(sepIndex + 1);
        console.log(`\n✅ Found Device: ${ip}:${pairPort}`);
        return { ip, pairPort };
      }
    }
    await wait(1000);
  }
}

function pair(adbCmd, address, pairPort) {
  console.log(`🔗 Pairing with ADB Device: ${address}:${pairPort} ${password}`);
  try {
    const output = execSync(
      `${adbCmd} pair ${address}:${pairPort} ${password}`,
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    console.log(`✅ Pairing Success: ${output.trim()}`);
    return true;
  } catch (e) {
    console.log(`❌ Error: ${e.stdout || e.stderr || e.message}`);
    return false;
  }
}

async function getConnectInfo(adbCmd, ip) {
  console.log(`🔍 Waiting for connection port to be broadcasted via mDNS...`);
  for (let attempt = 1; attempt <= 15; attempt++) {
    let deviceNearby = "";
    try {
      deviceNearby = execSync(`${adbCmd} mdns services`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch (e) {}

    const lines = deviceNearby.split("\n");
    for (const line of lines) {
      if (line.includes("_adb-tls-connect._tcp") && line.includes(ip)) {
        const parts = line.trim().split(/\s+/);
        const mdnsName = parts[0];
        const addressPort = parts.find(
          (p) => p.includes(":") && !p.includes("_adb"),
        );

        if (addressPort) {
          const sepIndex = addressPort.lastIndexOf(":");
          const connectPort = addressPort.substring(sepIndex + 1);
          return { connectPort, mdnsName };
        }
      }
    }
    await wait(1000);
  }
  return null;
}

async function connect(adbCmd, ip) {
  const connectInfo = await getConnectInfo(adbCmd, ip);

  if (!connectInfo) {
    console.log(
      "❌ Could not discover connection port via mDNS. Device might not be ready or dropped off Wi-Fi.",
    );
    return;
  }

  const { connectPort, mdnsName } = connectInfo;
  console.log(`🔗 Connecting to ADB Device via IP: ${ip}:${connectPort}`);

  try {
    const output = execSync(`${adbCmd} connect ${ip}:${connectPort}`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(`✅ ${output.trim()}`);

    // Clean up duplicate mDNS auto-connected device if it exists
    const duplicateId = `${mdnsName}._adb-tls-connect._tcp`;

    // Very small wait to ensure ADB had time to register both
    await wait(2000);

    try {
      const devices = execSync(`${adbCmd} devices`, { encoding: "utf-8" });
      if (devices.includes(duplicateId)) {
        console.log(
          `🧹 Removing duplicate auto-connected mDNS device: ${duplicateId}`,
        );
        try {
          execSync(`${adbCmd} disconnect ${duplicateId}`, { stdio: "ignore" });
          console.log("✨ Kept only the clean IP:PORT connection.");
        } catch (e) {}
      }
    } catch (e) {}
  } catch (e) {
    console.log(
      `❌ Connection attempt failed: ${e.stdout || e.stderr || e.message}`,
    );
  }
}

async function startQRPairing(adbCmd) {
  console.log("📱 ADB Wireless Debugging script mapped to Node.js");
  console.log(
    "Go to setting [Developer options] -> [Wireless debugging] -> [Pair device with QR code]",
  );
  showQR();

  const deviceInfo = await startDiscover(adbCmd);
  if (deviceInfo) {
    const { ip, pairPort } = deviceInfo;
    const paired = pair(adbCmd, ip, pairPort);
    if (paired) {
      await connect(adbCmd, ip);
    }
  }
}

module.exports = { startQRPairing };
