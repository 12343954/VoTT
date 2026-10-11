import { contextBridge, ipcRenderer } from "electron";

function serializeError(error: any): object {
    if (!error) {
        return { message: String(error) };
    }

    return {
        name: error.name,
        message: error.message || String(error),
        stack: error.stack,
    };
}

function writeRendererErrorLog(label: string, data: object = {}) {
    try {
        ipcRenderer.send("vott:error-log", {
            label,
            time: new Date().toISOString(),
            url: window.location.href,
            ...data,
        });
    } catch (error) {
        // Avoid throwing from the error logger itself.
    }
}

window.addEventListener("error", (event) => {
    writeRendererErrorLog("window-error", {
        colno: event.colno,
        error: serializeError(event.error),
        filename: event.filename,
        lineno: event.lineno,
        message: event.message,
    });
});

window.addEventListener("unhandledrejection", (event) => {
    writeRendererErrorLog("unhandled-rejection", {
        reason: serializeError(event.reason),
    });
});

contextBridge.exposeInMainWorld("process", {
    env: {
        NODE_ENV: process.env.NODE_ENV || (process.env.ELECTRON_START_URL ? "development" : "production"),
        PUBLIC_URL: process.env.PUBLIC_URL || "",
        REACT_APP_COMMIT_SHA: process.env.REACT_APP_COMMIT_SHA || "",
        REACT_APP_VERSION: process.env.REACT_APP_VERSION || "",
    },
    platform: process.platform,
});

function restoreMenuItem(menuItem: any): any {
    const restoredMenuItem = { ...menuItem };

    if (restoredMenuItem.clickId) {
        restoredMenuItem.click = () => ipcRenderer.send("vott:menu-click", restoredMenuItem.clickId);
    }

    if (restoredMenuItem.submenu) {
        restoredMenuItem.submenu = {
            items: restoredMenuItem.submenu.items.map(restoreMenuItem),
        };
    }

    return restoredMenuItem;
}

contextBridge.exposeInMainWorld("vottElectron", {
    ipcRenderer: {
        send: (channel: string, args?: any) => ipcRenderer.send(channel, args),
        on: (channel: string, listener: (sender: any, message: any) => void) => ipcRenderer.on(channel, listener),
        setMaxListeners: (n: number) => ipcRenderer.setMaxListeners(n),
    },
    app: {
        getAppPath: () => ipcRenderer.sendSync("vott:get-app-path"),
    },
    process: {
        platform: process.platform,
    },
    currentWindow: {
        on: (eventName: string, listener: () => void) => {
            ipcRenderer.on("vott:window-event", (event, actualEventName) => {
                if (eventName === actualEventName) {
                    listener();
                }
            });
        },
        isMaximized: () => ipcRenderer.sendSync("vott:get-window-state").isMaximized,
        isFullScreen: () => ipcRenderer.sendSync("vott:get-window-state").isFullScreen,
        setFullScreen: (isFullScreen: boolean) => ipcRenderer.send("vott:set-full-screen", isFullScreen),
        setTitle: (title: string) => ipcRenderer.send("vott:set-window-title", title),
        minimize: () => ipcRenderer.send("vott:window-command", "minimize"),
        maximize: () => ipcRenderer.send("vott:window-command", "maximize"),
        unmaximize: () => ipcRenderer.send("vott:window-command", "unmaximize"),
        close: () => ipcRenderer.send("vott:window-command", "close"),
    },
    menu: {
        getApplicationMenu: () => {
            const menu = ipcRenderer.sendSync("vott:get-application-menu");
            if (!menu) {
                return null;
            }

            return {
                items: menu.items.map(restoreMenuItem),
            };
        },
    },
    diagnostics: {
        getDrawTimingLogPath: () => ipcRenderer.sendSync("vott:get-draw-timing-log-path"),
        getErrorLogPath: () => ipcRenderer.sendSync("vott:get-error-log-path"),
        clearDrawTimingLog: () => ipcRenderer.send("vott:clear-draw-timing-log"),
        openDrawTimingLog: () => ipcRenderer.send("vott:open-draw-timing-log"),
        openErrorLog: () => ipcRenderer.send("vott:open-error-log"),
        writeDrawTimingLog: (line: string) => ipcRenderer.send("vott:draw-timing-log", line),
        writeErrorLog: (entry: object) => ipcRenderer.send("vott:error-log", entry),
    },
});
