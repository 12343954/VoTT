import { ToolbarItemFactory } from "./providers/toolbar/toolbarItemFactory";
import { ExportProject } from "./react/components/toolbar/exportProject";
import { SaveProject } from "./react/components/toolbar/saveProject";
import { ToolbarItemType } from "./react/components/toolbar/toolbarItem";
import { strings } from "./common/strings";

export enum ToolbarItemName {
    SelectCanvas = "selectCanvas",
    DrawRectangle = "drawRectangle",
    DrawPolygon = "drawPolygon",
    CopyRectangle = "copyRectangle",
    CopyRegions = "copyRegions",
    CutRegions = "cutRegions",
    PasteRegions = "pasteRegions",
    RemoveAllRegions = "removeAllRegions",
    PreviousAsset = "previousAsset",
    NextAsset = "nextAsset",
    SaveProject = "saveProject",
    ExportProject = "exportProject",
    ActiveLearning = "activeLearning",
    YoloDetect = "yoloDetect",
}

export enum ToolbarItemGroup {
    Canvas = "canvas",
    Regions = "regions",
    Navigation = "navigation",
    Project = "project",
    YOLO = "yolo",
}

/**
 * Registers items for toolbar
 */
export default function registerToolbar() {
    ToolbarItemFactory.register({
        name: ToolbarItemName.SelectCanvas,
        tooltip: strings.editorPage.toolbar.selectCanvas,
        icon: "fa-mouse-pointer",
        group: ToolbarItemGroup.Canvas,
        type: ToolbarItemType.State,
        accelerators: ["V", "v"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.DrawRectangle,
        tooltip: strings.editorPage.toolbar.drawRectangle,
        icon: "fa-vector-square",
        group: ToolbarItemGroup.Canvas,
        type: ToolbarItemType.State,
        accelerators: ["R", "r"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.DrawPolygon,
        tooltip: strings.editorPage.toolbar.drawPolygon,
        icon: "fa-draw-polygon",
        group: ToolbarItemGroup.Canvas,
        type: ToolbarItemType.State,
        accelerators: ["P", "p"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.CopyRectangle,
        tooltip: strings.editorPage.toolbar.copyRectangle,
        icon: "far fa-clone",
        group: ToolbarItemGroup.Canvas,
        type: ToolbarItemType.State,
        accelerators: ["CmdOrCtrl+W", "CmdOrCtrl+w"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.ActiveLearning,
        tooltip: strings.editorPage.toolbar.activeLearning,
        icon: "fas fa-graduation-cap",
        group: ToolbarItemGroup.Canvas,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+D", "CmdOrCtrl+d"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.CopyRegions,
        tooltip: strings.editorPage.toolbar.copyRegions,
        icon: "fa-copy",
        group: ToolbarItemGroup.Regions,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+C", "CmdOrCtrl+c"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.CutRegions,
        tooltip: strings.editorPage.toolbar.cutRegions,
        icon: "fa-cut",
        group: ToolbarItemGroup.Regions,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+X", "CmdOrCtrl+x"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.PasteRegions,
        tooltip: strings.editorPage.toolbar.pasteRegions,
        icon: "fa-paste",
        group: ToolbarItemGroup.Regions,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+V", "CmdOrCtrl+v"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.RemoveAllRegions,
        tooltip: strings.editorPage.toolbar.removeAllRegions,
        icon: "fa-ban",
        group: ToolbarItemGroup.Regions,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+Delete", "CmdOrCtrl+Backspace"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.PreviousAsset,
        tooltip: strings.editorPage.toolbar.previousAsset,
        icon: "fas fa-arrow-circle-up",
        group: ToolbarItemGroup.Navigation,
        type: ToolbarItemType.Action,
        accelerators: ["ArrowUp", "W", "w"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.NextAsset,
        tooltip: strings.editorPage.toolbar.nextAsset,
        icon: "fas fa-arrow-circle-down",
        group: ToolbarItemGroup.Navigation,
        type: ToolbarItemType.Action,
        accelerators: ["ArrowDown", "S", "s"],
    });

    //smith add 2024-4-2
    ToolbarItemFactory.register({
        name: ToolbarItemName.YoloDetect,
        tooltip: strings.editorPage.toolbar.yoloDetect,
        icon: "fa-icon-ai",
        group: ToolbarItemGroup.YOLO,
        type: ToolbarItemType.State,
        accelerators: ["Q", "q"],
    });

    ToolbarItemFactory.register({
        name: ToolbarItemName.SaveProject,
        tooltip: strings.editorPage.toolbar.saveProject,
        icon: "fa-save",
        group: ToolbarItemGroup.Project,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+S", "CmdOrCtrl+s"],
    }, SaveProject);

    ToolbarItemFactory.register({
        name: ToolbarItemName.ExportProject,
        tooltip: strings.editorPage.toolbar.exportProject,
        icon: "fa-external-link-square-alt",
        group: ToolbarItemGroup.Project,
        type: ToolbarItemType.Action,
        accelerators: ["CmdOrCtrl+E", "CmdOrCtrl+e"],
    }, ExportProject);
}
