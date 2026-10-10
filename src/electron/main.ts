import {
    app, ipcMain, BrowserWindow, BrowserWindowConstructorOptions,
    Menu, MenuItemConstructorOptions, shell,
} from "electron";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import registerMixins from "../registerMixins";
import { IpcMainProxy } from "./common/ipcMainProxy";
import LocalFileSystem from "./providers/storage/localFileSystem";
process.setMaxListeners(0);
// require('events').EventEmitter.defaultMaxListeners = 15;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow;
let ipcMainProxy: IpcMainProxy;
let electronHostBridgeRegistered = false;
let menuClickId = 0;
let menuClickHandlers: { [id: string]: Electron.MenuItem } = {};

function getDrawTimingLogPath(): string {
    return path.join(app.getPath("userData"), "vott-draw-timing.log");
}

function writeDrawTimingLog(entry: object): void {
    try {
        fs.appendFile(getDrawTimingLogPath(), `${JSON.stringify(entry)}\n`, (error) => {
            if (error) {
                console.warn(error);
            }
        });
    } catch (error) {
        console.warn(error);
    }
}

function logMainTiming(label: string, data: object = {}): void {
    writeDrawTimingLog({
        label,
        process: "main",
        time: new Date().toISOString(),
        ...data,
    });
}

function createWindow() {
    logMainTiming("create-window-enter", {
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
    });

    const windowOptions: BrowserWindowConstructorOptions = {
        width: 1024,
        height: 768,
        minWidth: 800,
        minHeight: 600,
        frame: process.platform !== "win32",
        backgroundColor: "#272B30",
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js"),
        },
    };

    if (process.platform === "darwin") {
        windowOptions.titleBarStyle = "hiddenInset";
    }

    const staticUrl = process.env.ELECTRON_START_URL || pathToFileURL(path.join(__dirname, "index.html")).toString();
    if (process.env.ELECTRON_START_URL) {
        windowOptions.webPreferences = {
            ...windowOptions.webPreferences,
            webSecurity: false,
        };
    }

    mainWindow = new BrowserWindow(windowOptions);
    registerElectronHostBridge();
    registerWindowStateEvents(mainWindow);
    mainWindow.loadURL(staticUrl);
    logMainTiming("load-url", { url: staticUrl });
    // mainWindow.maximize();

    // Emitted when the window is closed.
    mainWindow.on("closed", () => {
        logMainTiming("window-closed");
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    // Provides a more graceful experience and eliminates the white screen on load
    // This event fires after the app first render
    mainWindow.once("ready-to-show", () => {
        logMainTiming("ready-to-show");
        mainWindow.show();
    });

    registerContextMenu(mainWindow);

    ipcMainProxy = new IpcMainProxy(ipcMain, mainWindow);
    ipcMainProxy.register("RELOAD_APP", onReloadApp);
    ipcMainProxy.register("TOGGLE_DEV_TOOLS", onToggleDevTools);

    const localFileSystem = new LocalFileSystem(mainWindow);
    ipcMainProxy.registerProxy("LocalFileSystem", localFileSystem);
}

function registerElectronHostBridge() {
    if (electronHostBridgeRegistered) {
        return;
    }
    electronHostBridgeRegistered = true;

    ipcMain.on("vott:get-app-path", (event) => {
        event.returnValue = app.getAppPath();
    });

    ipcMain.on("vott:get-window-state", (event) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        event.returnValue = {
            isFullScreen: browserWindow ? browserWindow.isFullScreen() : false,
            isMaximized: browserWindow ? browserWindow.isMaximized() : false,
        };
    });

    ipcMain.on("vott:set-window-title", (event, title: string) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        if (browserWindow) {
            browserWindow.setTitle(title);
        }
    });

    ipcMain.on("vott:window-command", (event, command: string) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        if (!browserWindow) {
            return;
        }

        switch (command) {
            case "minimize":
                browserWindow.minimize();
                break;
            case "maximize":
                browserWindow.maximize();
                break;
            case "unmaximize":
                browserWindow.unmaximize();
                break;
            case "close":
                browserWindow.close();
                break;
        }
    });

    ipcMain.on("vott:get-application-menu", (event) => {
        const menu = Menu.getApplicationMenu();
        event.returnValue = menu ? serializeMenu(menu) : null;
    });

    ipcMain.on("vott:menu-click", (event, clickId: string) => {
        const menuItem = menuClickHandlers[clickId];
        if (menuItem && menuItem.click) {
            const browserWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
            menuItem.click.call(menuItem, menuItem, browserWindow, event);
        }
    });

    ipcMain.on("vott:get-draw-timing-log-path", (event) => {
        event.returnValue = getDrawTimingLogPath();
    });

    ipcMain.on("vott:clear-draw-timing-log", () => {
        fs.writeFile(getDrawTimingLogPath(), "", (error) => {
            if (error) {
                console.warn(error);
            }
            logMainTiming("clear-draw-timing-log");
        });
    });

    ipcMain.on("vott:draw-timing-log", (event, line: string) => {
        let rendererEntry: object;
        try {
            rendererEntry = JSON.parse(line);
        } catch (error) {
            rendererEntry = { line };
        }

        writeDrawTimingLog({
            ...rendererEntry,
            process: "renderer",
            mainReceivedAt: new Date().toISOString(),
        });
    });

    ipcMain.on("vott:open-draw-timing-log", () => {
        const logPath = getDrawTimingLogPath();
        fs.closeSync(fs.openSync(logPath, "a"));
        logMainTiming("open-draw-timing-log", { path: logPath });
        shell.openPath(logPath).then((errorMessage) => {
            if (errorMessage) {
                console.warn(errorMessage);
            }
        });
    });
}

function registerWindowStateEvents(browserWindow: BrowserWindow) {
    ["maximize", "unmaximize", "enter-full-screen", "leave-full-screen", "focus", "blur"].forEach((eventName) => {
        (browserWindow as any).on(eventName, () => {
            logMainTiming(`window-${eventName}`);
            if (!browserWindow.isDestroyed()) {
                browserWindow.webContents.send("vott:window-event", eventName);
            }
        });
    });
}

function serializeMenu(menu: Electron.Menu): any {
    menuClickHandlers = {};
    menuClickId = 0;

    return {
        items: menu.items.map(serializeMenuItem),
    };
}

function serializeMenuItem(menuItem: Electron.MenuItem): any {
    const serializedMenuItem: any = {
        accelerator: menuItem["accelerator"],
        checked: menuItem.checked,
        enabled: menuItem.enabled,
        label: menuItem.label,
        role: menuItem["role"],
        sublabel: menuItem["sublabel"],
        type: menuItem["type"],
        visible: menuItem.visible,
    };

    if (menuItem.click) {
        const clickId = `menu-${++menuClickId}`;
        menuClickHandlers[clickId] = menuItem;
        serializedMenuItem.clickId = clickId;
    }

    if (menuItem.submenu) {
        serializedMenuItem.submenu = {
            items: menuItem.submenu.items.map(serializeMenuItem),
        };
    }

    return serializedMenuItem;
}

function onReloadApp() {
    mainWindow.reload();
    return true;
}

function onToggleDevTools() {
    mainWindow.webContents.toggleDevTools();
}

/**
 * Adds standard cut/copy/paste/etc context menu comments when right clicking input elements
 * @param browserWindow The browser window to apply the context-menu items
 */
function registerContextMenu(browserWindow: BrowserWindow): void {
    const selectionMenu = Menu.buildFromTemplate([
        { role: "copy", accelerator: "CmdOrCtrl+C" },
        { type: "separator" },
        { role: "selectAll", accelerator: "CmdOrCtrl+A" },
    ]);

    const inputMenu = Menu.buildFromTemplate([
        { role: "undo", accelerator: "CmdOrCtrl+Z" },
        { role: "redo", accelerator: "CmdOrCtrl+Shift+Z" },
        { type: "separator" },
        { role: "cut", accelerator: "CmdOrCtrl+X" },
        { role: "copy", accelerator: "CmdOrCtrl+C" },
        { role: "paste", accelerator: "CmdOrCtrl+V" },
        { type: "separator" },
        { role: "selectAll", accelerator: "CmdOrCtrl+A" },
    ]);

    browserWindow.webContents.on("context-menu", (e, props) => {
        const { selectionText, isEditable } = props;
        if (isEditable) {
            inputMenu.popup({
                window: browserWindow,
            });
        } else if (selectionText && selectionText.trim() !== "") {
            selectionMenu.popup({
                window: browserWindow,
            });
        }
    });

    const menuItems: MenuItemConstructorOptions[] = [
        {
            label: "File", submenu: [
                { role: "quit" },
            ],
        },
        { role: "editMenu" },
        {
            label: "View", submenu: [
                { role: "reload" },
                { type: "separator" },
                { role: "toggleDevTools" },
                { role: "togglefullscreen" },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
            ],
        },
        { role: "windowMenu" },
    ];
    const menu = Menu.buildFromTemplate(menuItems);
    Menu.setApplicationMenu(menu);
}

registerMixins();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    logMainTiming("app-ready");
    createWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    logMainTiming("window-all-closed");
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    logMainTiming("app-activate", { hasWindow: mainWindow !== null });
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
