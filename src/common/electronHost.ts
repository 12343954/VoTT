export interface IElectronHost {
    ipcRenderer: {
        send: (channel: string, args?: any) => void;
        on: (channel: string, listener: (sender: any, message: any) => void) => void;
        setMaxListeners: (n: number) => void;
    };
    app: {
        getAppPath: () => string;
    };
    process: {
        platform: string;
    };
    currentWindow: {
        on: (eventName: string, listener: () => void) => void;
        isMaximized: () => boolean;
        isFullScreen: () => boolean;
        setTitle: (title: string) => void;
        minimize: () => void;
        maximize: () => void;
        unmaximize: () => void;
        close: () => void;
    };
    menu: {
        getApplicationMenu: () => Electron.Menu;
    };
    diagnostics: {
        getDrawTimingLogPath: () => string;
        clearDrawTimingLog: () => void;
        openDrawTimingLog: () => void;
        writeDrawTimingLog: (line: string) => void;
    };
}

export function getElectronHost(): IElectronHost {
    return (window as any).vottElectron as IElectronHost;
}

export function hasElectronHost(): boolean {
    return typeof window !== "undefined" && !!getElectronHost();
}

export function getElectronPlatform(): string {
    const electronHost = hasElectronHost() ? getElectronHost() : null;
    return electronHost && electronHost.process ? electronHost.process.platform : null;
}
