const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");
const extract = require("extract-zip");
const readline = require("readline");

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          return downloadFile(response.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }

        const totalSize = parseInt(response.headers["content-length"], 10);
        let downloadedCount = 0;

        response.on("data", (chunk) => {
          downloadedCount += chunk.length;
          const percent = totalSize
            ? Math.round((downloadedCount / totalSize) * 100)
            : 0;
          process.stdout.write(`\rDownloading... ${percent}%`);
        });

        response.pipe(file);
        file.on("finish", () => {
          process.stdout.write("\n");
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

async function promptForDownload() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      "📥 ADB was not found in PATH or locally. Do you want to download it now? (y/N) ",
      (answer) => {
        rl.close();
        const lower = answer.toLowerCase().trim();
        resolve(lower === "y" || lower === "yes");
      },
    );
  });
}

function getAdbCommand() {
  const platformToolsDir = path.join(__dirname, "platform-tools");
  const adbExe = process.platform === "win32" ? "adb.exe" : "adb";
  const localAdbPath = path.join(platformToolsDir, adbExe);

  if (fs.existsSync(localAdbPath)) {
    return `"${localAdbPath}"`;
  }

  try {
    execSync("adb version", { stdio: "ignore" });
    return "adb"; // adb is in PATH
  } catch (e) {
    return null;
  }
}

async function getAdbVersion(cmd) {
  if (!cmd) return null;
  try {
    const output = execSync(`${cmd} version`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match = output.match(/Version\s+(\S+)/);
    return match ? match[1] : "Unknown";
  } catch (e) {
    return null;
  }
}

async function downloadAdb(force = false, skipPrompt = false) {
  let existingCmd = getAdbCommand();

  if (!force && existingCmd) {
    return existingCmd;
  }

  if (!existingCmd && !force && !skipPrompt) {
    const shouldDownload = await promptForDownload();
    if (!shouldDownload) {
      console.log("❌ ADB is required to continue. Exiting.");
      process.exit(1);
    }
  }

  let oldVersion = await getAdbVersion(existingCmd);

  const platform = process.platform;
  let url = "";
  let adbExe = "adb";

  if (platform === "win32") {
    url =
      "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";
    adbExe = "adb.exe";
  } else if (platform === "linux") {
    url =
      "https://dl.google.com/android/repository/platform-tools-latest-linux.zip";
  } else if (platform === "darwin") {
    url =
      "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip";
  } else {
    throw new Error(
      `Unsupported platform for auto-downloading ADB: ${platform}`,
    );
  }

  console.log(`📥 Downloading ADB for ${platform} from ${url}...`);
  const zipPath = path.join(__dirname, "platform-tools.zip");
  await downloadFile(url, zipPath);

  console.log(`📦 Extracting ADB...`);
  await extract(zipPath, { dir: __dirname });
  fs.unlinkSync(zipPath);

  const localAdbPath = path.join(__dirname, "platform-tools", adbExe);
  if (platform !== "win32") {
    fs.chmodSync(localAdbPath, 0o755);
  }

  const newCmd = `"${localAdbPath}"`;
  const newVersion = await getAdbVersion(newCmd);

  console.log(`✅ ADB downloaded successfully.`);
  if (oldVersion) {
    console.log(`Version updated: ${oldVersion} -> ${newVersion}`);
  } else {
    console.log(`Version installed: ${newVersion}`);
  }

  return newCmd;
}

module.exports = {
  getAdbCommand,
  downloadAdb,
};
