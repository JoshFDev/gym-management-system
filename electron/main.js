const { app, BrowserWindow, Menu, globalShortcut, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { fork } = require("child_process");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mainWindow = null;
let backendProcess = null;
let mongod = null;

const PORT = 3000;

async function startMongoDB() {
    const dbPath = path.join(app.getPath("userData"), "mongodb-data");
    fs.mkdirSync(dbPath, { recursive: true });

    mongod = await MongoMemoryServer.create({
        instance: {
            dbPath,
            dbName: "zenithgym",
        },
    });

    const uri = mongod.getUri();
    console.log(`[Electron] MongoDB corriendo en ${uri}`);
    console.log(`[Electron] Datos guardados en ${dbPath}`);
    return uri;
}

function startBackend(mongoUri) {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(__dirname, "../backend/dist/server.js");
        let started = false;

        const timeout = setTimeout(() => {
            if (!started) reject(new Error("Timeout: backend no inició en 30s"));
        }, 30000);

        backendProcess = fork(serverPath, [], {
            env: {
                ...process.env,
                MONGO_URI: mongoUri,
                PORT: String(PORT),
                FRONTEND_URL: `http://localhost:${PORT}`,
                SERVE_FRONTEND: "true",
                JWT_SECRET: process.env.JWT_SECRET || "zenithgym-electron-secret",
                JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
            },
            stdio: "pipe",
        });

        backendProcess.stdout.on("data", (data) => {
            const msg = data.toString().trim();
            if (msg) console.log(`  ${msg}`);
            if (msg.includes("Server running")) {
                started = true;
                clearTimeout(timeout);
                resolve();
            }
        });

        backendProcess.stderr.on("data", (data) => {
            const msg = data.toString().trim();
            if (msg) console.error(`  ${msg}`);
        });

        backendProcess.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        backendProcess.on("exit", (code) => {
            clearTimeout(timeout);
            console.log(`[Electron] Backend terminado (código ${code})`);
            if (!started) reject(new Error(`Backend terminó con código ${code} antes de iniciar`));
        });
    });
}

function createWindow() {
    // Sin menú de aplicación (File, Edit, View, etc.)
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "ZenithGym",
        icon: path.join(__dirname, "../frontend/public/logogym.png"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });

    console.log(`[Electron] Cargando http://localhost:${PORT} ...`);
    mainWindow.loadURL(`http://localhost:${PORT}`)
        .catch((err) => console.error("[Electron] Error al cargar URL:", err));

    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDesc) => {
        console.error(`[Electron] Fallo al cargar: ${errorCode} - ${errorDesc}`);
        setTimeout(() => {
            mainWindow.loadURL(`http://localhost:${PORT}`).catch(() => {});
        }, 2000);
    });

    mainWindow.webContents.on("dom-ready", () => {
        console.log("[Electron] DOM listo");
    });

    mainWindow.webContents.on("did-finish-load", () => {
        console.log("[Electron] Página cargada");
        // Ajustar zoom según el tamaño de pantalla
        const display = screen.getPrimaryDisplay();
        const width = display.workAreaSize.width;
        let zoom = 1.0;
        if (width >= 2560) zoom = 1.3;
        else if (width >= 1920) zoom = 1.0;
        else if (width >= 1600) zoom = 0.9;
        else zoom = 0.85;
        mainWindow.webContents.setZoomFactor(zoom);
        console.log(`[Electron] Zoom ajustado a ${zoom} (pantalla ${width}px)`);
    });

    mainWindow.once("ready-to-show", () => {
        console.log("[Electron] Ventana lista, mostrando...");
        mainWindow.show();
        mainWindow.maximize();
    });

    // Fallback: forzar mostrar ventana tras 15s aunque no haya disparado ready-to-show
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            console.log("[Electron] Forzando mostrar ventana (timeout)");
            mainWindow.show();
        }
    }, 15000);

    mainWindow.on("closed", () => (mainWindow = null));

    // Atajos de teclado
    globalShortcut.register("F11", () => {
        if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
    });
    globalShortcut.register("Control+Q", () => app.quit());

    // Escape minimiza (solo cuando la ventana está enfocada, no interfiere con modales)
    mainWindow.webContents.on("before-input-event", (_event, input) => {
        if (input.key === "Escape" && !input.isAutoRepeat) {
            if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
            mainWindow.minimize();
        }
    });
}

async function main() {
    try {
        console.log("[Electron] Iniciando MongoDB...");
        const mongoUri = await startMongoDB();

        console.log("[Electron] Iniciando servidor...");
        await startBackend(mongoUri);

        console.log("[Electron] Abriendo ventana...");
        createWindow();
    } catch (err) {
        console.error("[Electron] Error:", err);
        if (backendProcess) backendProcess.kill();
        if (mongod) await mongod.stop().catch(() => {});
        app.quit();
    }
}

app.whenReady().then(main);

app.on("window-all-closed", async () => {
    globalShortcut.unregisterAll();
    if (backendProcess) backendProcess.kill();
    if (mongod) await mongod.stop();
    app.quit();
});

app.on("activate", () => {
    if (mainWindow) mainWindow.loadURL(`http://localhost:${PORT}`);
});
