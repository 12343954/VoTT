import { contextBridge, ipcRenderer } from "electron";

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
        clearDrawTimingLog: () => ipcRenderer.send("vott:clear-draw-timing-log"),
        openDrawTimingLog: () => ipcRenderer.send("vott:open-draw-timing-log"),
        writeDrawTimingLog: (line: string) => ipcRenderer.send("vott:draw-timing-log", line),
    },
});
