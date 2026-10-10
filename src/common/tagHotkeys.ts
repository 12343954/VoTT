import { IAppSettings } from "../models/applicationState";

export const DEFAULT_TAG_HOTKEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export const RESERVED_HOTKEYS = [
    "V", "R", "P", "Q", "W", "S", "A", "D", "E",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "CmdOrCtrl+W", "CmdOrCtrl+D", "CmdOrCtrl+C", "CmdOrCtrl+X", "CmdOrCtrl+V",
    "CmdOrCtrl+Delete", "CmdOrCtrl+Backspace", "CmdOrCtrl+S", "CmdOrCtrl+E",
];

export interface ITagHotkeyRegistration {
    index: number;
    hotkey: string;
    accelerators: string[];
}

export function getTagHotkeys(appSettings: IAppSettings): string[] {
    return appSettings && appSettings.tagHotkeys && appSettings.tagHotkeys.length
        ? appSettings.tagHotkeys
        : DEFAULT_TAG_HOTKEYS;
}

export function getTagHotkeyRegistrations(appSettings: IAppSettings): ITagHotkeyRegistration[] {
    const usedHotkeys = new Set<string>();
    return getTagHotkeys(appSettings)
        .map((hotkey, index) => ({
            index,
            hotkey: normalizeTagHotkey(hotkey),
        }))
        .filter((config) => {
            if (!config.hotkey || isReservedTagHotkey(config.hotkey) || usedHotkeys.has(config.hotkey.toUpperCase())) {
                return false;
            }
            usedHotkeys.add(config.hotkey.toUpperCase());
            return true;
        })
        .map((config) => ({
            ...config,
            accelerators: getTagHotkeyAccelerators(config.hotkey),
        }));
}

export function getTagHotkeyAccelerators(hotkey: string): string[] {
    if (!hotkey) {
        return [];
    }

    return isLetterHotkey(hotkey) ? [hotkey, hotkey.toLowerCase()] : [hotkey];
}

export function getTagIndexFromHotkey(key: string): number {
    return getTagIndexFromHotkeys(DEFAULT_TAG_HOTKEYS, key);
}

export function getTagIndexFromHotkeys(tagHotkeys: string[], key: string): number {
    const normalizedKey = normalizeTagHotkey(key);
    if (!normalizedKey) {
        return -1;
    }

    return tagHotkeys
        .map((hotkey) => normalizeTagHotkey(hotkey))
        .findIndex((hotkey) => hotkey && hotkey.toUpperCase() === normalizedKey.toUpperCase());
}

export function isReservedTagHotkey(hotkey: string): boolean {
    const normalizedHotkey = normalizeTagHotkey(hotkey);
    return RESERVED_HOTKEYS.some((reserved) => normalizeTagHotkey(reserved).toUpperCase() === normalizedHotkey.toUpperCase());
}

export function normalizeTagHotkey(hotkey: string): string {
    return hotkey ? hotkey.trim() : null;
}

function isLetterHotkey(hotkey: string): boolean {
    return /^[A-Z]$/.test(hotkey);
}
