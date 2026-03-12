const { app, BrowserWindow, session } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

let mainWindow;
let nextProcess;
const DEV_PORT = 3000;

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findFreePort(startPort + 1)));
  });
}

function waitForServer(port, retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      const req = require("http").get(`http://localhost:${port}`, () => {
        resolve();
      });
      req.on("error", () => {
        if (attempt >= retries) {
          reject(new Error("Next.js server did not start in time"));
          return;
        }
        setTimeout(() => check(attempt + 1), 1000);
      });
    };
    check(0);
  });
}

async function startNextServer() {
  const isDev = !app.isPackaged;
  const port = isDev ? DEV_PORT : await findFreePort(3000);

  if (isDev) {
    nextProcess = spawn("npm", ["run", "dev"], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PORT: String(port) },
      shell: true,
      stdio: "pipe",
    });
    nextProcess.stdout?.on("data", (d) => process.stdout.write(d));
    nextProcess.stderr?.on("data", (d) => process.stderr.write(d));
  } else {
    nextProcess = spawn(
      process.execPath.includes("Electron")
        ? path.join(process.resourcesPath, "node_modules/.bin/next")
        : "npx",
      ["next", "start", "-p", String(port)],
      {
        cwd: isDev ? path.join(__dirname, "..") : process.resourcesPath,
        env: { ...process.env, PORT: String(port) },
        shell: true,
        stdio: "pipe",
      }
    );
    nextProcess.stdout?.on("data", (d) => process.stdout.write(d));
    nextProcess.stderr?.on("data", (d) => process.stderr.write(d));
  }

  return port;
}

async function createWindow(port) {
  // Disable CORS in the Electron renderer so fetch() can hit any origin
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, Origin: "*" } });
  });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Access-Control-Allow-Origin": ["*"],
        "Access-Control-Allow-Headers": ["*"],
        "Access-Control-Allow-Methods": ["*"],
      },
    });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Mini Postman",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // disables CORS enforcement
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  try {
    const port = await startNextServer();
    await waitForServer(port);
    await createWindow(port);
  } catch (err) {
    console.error("Failed to start:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
});

app.on("activate", async () => {
  if (mainWindow === null) {
    const port = DEV_PORT;
    await createWindow(port);
  }
});
