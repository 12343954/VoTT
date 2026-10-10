import React, { Fragment, ReactElement } from "react";
import * as shortid from "shortid";
import { CanvasTools } from "vott-ct";
import { RegionData } from "vott-ct/lib/js/CanvasTools/Core/RegionData";
import {
    EditorMode, IAssetMetadata,
    IProject, IRegion, IUser, RegionType,
} from "../../../../models/applicationState";
import CanvasHelpers from "./canvasHelpers";
import { AssetPreview, ContentSource } from "../../common/assetPreview/assetPreview";
import { Editor } from "vott-ct/lib/js/CanvasTools/CanvasTools.Editor";
import Clipboard from "../../../../common/clipboard";
import Confirm from "../../common/confirm/confirm";
import { strings } from "../../../../common/strings";
import { SelectionMode } from "vott-ct/lib/js/CanvasTools/Interface/ISelectorSettings";
import { Rect } from "vott-ct/lib/js/CanvasTools/Core/Rect";
import { Point2D } from "vott-ct/lib/js/CanvasTools/Core/Point2D";
import { createContentBoundingBox } from "../../../../common/layout";
import { getElectronHost, hasElectronHost } from "../../../../common/electronHost";

export interface ICanvasProps extends React.Props<Canvas> {
    selectedAsset: IAssetMetadata;
    editorMode: EditorMode;
    selectionMode: SelectionMode;
    project: IProject;
    lockedTags: string[];
    children?: ReactElement<AssetPreview>;
    onAssetMetadataChanged?: (assetMetadata: IAssetMetadata) => void;
    onSelectedRegionsChanged?: (regions: IRegion[]) => void;
    onCanvasRendered?: (canvas: HTMLCanvasElement) => void;
}

export interface ICanvasState {
    currentAsset: IAssetMetadata;
    contentSource: ContentSource;
    enabled: boolean;
}

export default class Canvas extends React.Component<ICanvasProps, ICanvasState> {
    private static minRectangleSize = 3;
    private static drawTimingLogInitialized = false;

    public static defaultProps: ICanvasProps = {
        selectionMode: SelectionMode.NONE,
        editorMode: EditorMode.Select,
        selectedAsset: null,
        project: null,
        lockedTags: [],
    };

    public editor: Editor;

    public state: ICanvasState = {
        currentAsset: this.props.selectedAsset,
        contentSource: null,
        enabled: false,
    };

    private currentAsset: IAssetMetadata = this.props.selectedAsset;
    private isDrawingRegion = false;
    private pendingDrawTags: string[] = [];
    private suppressCanvasToolsRefresh = false;
    private selectedRegionId: string = null;
    private restoringSelectedRegion = false;
    private selectionBoxHideTimer: number = null;
    private rectPointerUpHandler: (event: PointerEvent) => void = null;
    private drawTimingStart: number = null;
    private drawTimingLast: number = null;
    private drawTimingId = 0;

    private canvasZone: React.RefObject<HTMLDivElement> = React.createRef();
    private clearConfirm: React.RefObject<Confirm> = React.createRef();

    private template: Rect = new Rect(20, 20);

    public componentDidMount = () => {
        this.initializeDrawTimingLog();
        const sz = document.getElementById("editor-zone") as HTMLDivElement;
        this.editor = new CanvasTools.Editor(sz);
        this.editor.autoResize = false;
        this.editor.onSelectionBegin = this.onSelectionBegin;
        this.editor.onSelectionEnd = this.onSelectionEnd;
        this.editor.onRegionMoveEnd = this.onRegionMoveEnd;
        this.editor.onRegionDelete = this.onRegionDelete;
        this.editor.onRegionSelected = this.onRegionSelected;
        this.editor.AS.setSelectionMode({ mode: this.props.selectionMode });
        this.installImmediateRectPointerUp();

        window.addEventListener("resize", this.onWindowResize);
    }

    public componentWillUnmount() {
        this.clearSelectionBoxHideTimer();
        this.uninstallImmediateRectPointerUp();
        window.removeEventListener("resize", this.onWindowResize);
    }

    public componentDidUpdate = async (prevProps: Readonly<ICanvasProps>, prevState: Readonly<ICanvasState>) => {
        // Handles asset changing
        if (this.props.selectedAsset !== prevProps.selectedAsset) {
            this.currentAsset = this.props.selectedAsset;
            this.setState({ currentAsset: this.props.selectedAsset });
        }

        // Handle selection mode changes
        if (this.props.selectionMode !== prevProps.selectionMode) {
            const options = (this.props.selectionMode === SelectionMode.COPYRECT) ? this.template : null;
            this.editor.AS.setSelectionMode({ mode: this.props.selectionMode, template: options });
        }

        const assetIdChanged = this.state.currentAsset.asset.id !== prevState.currentAsset.asset.id;

        // When the selected asset has changed but is still the same asset id
        if (!assetIdChanged && this.state.currentAsset !== prevState.currentAsset) {
            if (this.suppressCanvasToolsRefresh) {
                this.suppressCanvasToolsRefresh = false;
            } else {
                this.refreshCanvasToolsRegions();
            }
        }

        // When the project tags change re-apply tags to regions
        if (this.props.project.tags !== prevProps.project.tags) {
            this.updateCanvasToolsRegionTags();
        }

        // Handles when the canvas is enabled & disabled
        if (prevState.enabled !== this.state.enabled) {
            // When the canvas is ready to display
            if (this.state.enabled) {
                this.refreshCanvasToolsRegions();
                this.setContentSource(this.state.contentSource);
                this.editor.AS.setSelectionMode(this.props.selectionMode);
                this.editor.AS.enable();

                if (this.props.onSelectedRegionsChanged) {
                    this.props.onSelectedRegionsChanged(this.getSelectedRegions());
                }
            } else { // When the canvas has been disabled
                this.editor.AS.disable();
                this.clearAllRegions();
                this.editor.AS.setSelectionMode(SelectionMode.NONE);
            }
        }
    }

    public render = () => {
        const className = this.state.enabled ? "canvas-enabled" : "canvas-disabled";
        return (
            <Fragment>
                <Confirm title={strings.editorPage.canvas.removeAllRegions.title}
                    ref={this.clearConfirm as any}
                    message={strings.editorPage.canvas.removeAllRegions.confirmation}
                    confirmButtonColor="danger"
                    onConfirm={this.removeAllRegions}
                />
                <div id="ct-zone" ref={this.canvasZone} className={className} onClick={(e) => e.stopPropagation()}>
                    <div id="selection-zone">
                        <div id="editor-zone" className="full-size" />
                    </div>
                </div>
                {this.renderChildren()}
            </Fragment>
        );
    }

    /**
     * Toggles tag on all selected regions
     * @param selectedTag Tag name
     */
    public applyTag = (tag: string) => {
        const selectedRegions = this.getSelectedRegions();
        const lockedTags = this.props.lockedTags;
        const lockedTagsEmpty = !lockedTags || !lockedTags.length;
        const regionsEmpty = !selectedRegions || !selectedRegions.length;
        if (regionsEmpty && tag && this.isDrawingRegion) {
            this.pendingDrawTags = lockedTagsEmpty ? [tag] : lockedTags;
            return;
        }
        if ((!tag && lockedTagsEmpty) || regionsEmpty) {
            return;
        }
        let transformer: (tags: string[], tag: string) => string[];
        if (lockedTagsEmpty) {
            // Tag selected while region(s) selected
            transformer = CanvasHelpers.toggleTag;
        } else if (lockedTags.find((t) => t === tag)) {
            // Tag added to locked tags while region(s) selected
            transformer = CanvasHelpers.addIfMissing;
        } else {
            // Tag removed from locked tags while region(s) selected
            transformer = CanvasHelpers.removeIfContained;
        }
        for (const selectedRegion of selectedRegions) {
            selectedRegion.tags = transformer(selectedRegion.tags, tag);
        }
        this.updateRegions(selectedRegions);
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged(selectedRegions);
        }
    }

    public copyRegions = async () => {
        await Clipboard.writeObject(this.getSelectedRegions());
    }

    public cutRegions = async () => {
        const selectedRegions = this.getSelectedRegions();
        await Clipboard.writeObject(selectedRegions);
        this.deleteRegions(selectedRegions);
    }

    public pasteRegions = async () => {
        const regionsToPaste: IRegion[] = await Clipboard.readObject();
        const asset = this.state.currentAsset;
        const duplicates = CanvasHelpers.duplicateRegionsAndMove(
            regionsToPaste,
            asset.regions,
            asset.asset.size.width,
            asset.asset.size.height,
        );
        this.addRegions(duplicates);
    }

    public confirmRemoveAllRegions = () => {
        this.clearConfirm.current.open();
    }

    public getSelectedRegions = (): IRegion[] => {
        const selectedRegionBounds = this.editor.RM.getSelectedRegionsBounds() || [];
        const selectedRegions = selectedRegionBounds.map((rb) => rb.id);
        if (!this.currentAsset || !this.currentAsset.regions) {
            return [];
        }
        return this.currentAsset.regions.filter((r) => selectedRegions.find((id) => r.id === id));
    }

    // smith add 2024-4-4
    public onHighlightRegions = (regions: IRegion[]) => {
        if (regions.length == 0) return;
        for (var region of regions) {
            // console.log('onHighlightRegions from canvas.tsx', region.id)
            this.editor.RM.selectRegionById(region.id)
            // this.onRegionSelected(region.id, true);
        }
    }

    public updateCanvasToolsRegionTags = (): void => {
        for (const region of this.state.currentAsset.regions) {
            this.editor.RM.updateTagsById(
                region.id,
                CanvasHelpers.getTagsDescriptor(this.props.project.tags, region),
            );
        }
    }

    public forceResize = (): void => {
        this.onWindowResize();
    }

    private removeAllRegions = () => {
        const ids = this.state.currentAsset.regions.map((r) => r.id);
        for (const id of ids) {
            this.editor.RM.deleteRegionById(id);
        }
        this.deleteRegionsFromAsset(this.state.currentAsset.regions);
    }

    private addRegions = (regions: IRegion[]) => {
        this.addRegionsToCanvasTools(regions);
        this.addRegionsToAsset(regions);
    }

    private addRegionsToAsset = (regions: IRegion[]) => {
        this.updateAssetRegions(
            this.state.currentAsset.regions.concat(regions),
        );
    }

    private addRegionsToCanvasTools = (regions: IRegion[]) => {
        for (const region of regions) {
            const regionData = CanvasHelpers.getRegionData(region);
            const scaledRegionData = this.editor.scaleRegionToFrameSize(
                regionData,
                this.state.currentAsset.asset.size.width,
                this.state.currentAsset.asset.size.height);
            this.editor.RM.addRegion(
                region.id,
                scaledRegionData,
                CanvasHelpers.getTagsDescriptor(this.props.project.tags, region),
            );
        }
    }

    private deleteRegions = (regions: IRegion[]) => {
        this.deleteRegionsFromCanvasTools(regions);
        this.deleteRegionsFromAsset(regions);
    }

    private deleteRegionsFromAsset = (regions: IRegion[]) => {
        const filteredRegions = this.state.currentAsset.regions.filter((assetRegion) => {
            return !regions.find((r) => r.id === assetRegion.id);
        });
        this.updateAssetRegions(filteredRegions);
    }

    private deleteRegionsFromCanvasTools = (regions: IRegion[]) => {
        for (const region of regions) {
            this.editor.RM.deleteRegionById(region.id);
        }
    }

    /**
     * Method that gets called when a new region is drawn
     * @param {RegionData} regionData the RegionData of created region
     * @returns {void}
     */
    private onSelectionBegin = () => {
        this.startDrawTiming("selection-begin");
        this.clearSelectionBoxHideTimer();
        this.resetSelectionBoxStyle();
        this.isDrawingRegion = true;
        this.pendingDrawTags = [];
    }

    private onSelectionEnd = (regionData: RegionData) => {
        this.logDrawTiming("selection-end-enter", {
            height: regionData && regionData.height,
            width: regionData && regionData.width,
            x: regionData && regionData.x,
            y: regionData && regionData.y,
        });
        if (CanvasHelpers.isEmpty(regionData) || this.isTooSmallRectangle(regionData)) {
            this.isDrawingRegion = false;
            this.pendingDrawTags = [];
            this.logDrawTiming("selection-end-ignored");
            return;
        }
        const id = shortid.generate();

        const addRegionStart = performance.now();
        this.editor.RM.addRegion(id, regionData, null);
        this.logDrawTiming("rm-add-region", {
            duration: Math.round((performance.now() - addRegionStart) * 100) / 100,
            id,
        });

        this.template = new Rect(regionData.width, regionData.height);

        // RegionData not serializable so need to extract data
        const scaledRegionData = this.editor.scaleRegionToSourceSize(
            regionData,
            this.state.currentAsset.asset.size.width,
            this.state.currentAsset.asset.size.height,
        );
        const lockedTags = this.props.lockedTags;
        const newRegionTags = (lockedTags && lockedTags.length) ? lockedTags : this.pendingDrawTags;
        const newRegion = {
            id,
            type: this.editorModeToType(this.props.editorMode),
            tags: newRegionTags || [],
            boundingBox: {
                height: scaledRegionData.height,
                width: scaledRegionData.width,
                left: scaledRegionData.x,
                top: scaledRegionData.y,
            },
            points: scaledRegionData.points,
        };
        if (newRegion.tags && newRegion.tags.length) {
            const updateTagsStart = performance.now();
            this.editor.RM.updateTagsById(id, CanvasHelpers.getTagsDescriptor(this.props.project.tags, newRegion));
            this.logDrawTiming("rm-update-tags", {
                duration: Math.round((performance.now() - updateTagsStart) * 100) / 100,
                id,
            });
        }
        this.isDrawingRegion = false;
        this.pendingDrawTags = [];
        this.hideSelectionBox();
        this.logDrawTiming("before-update-asset-regions", { id });
        this.updateAssetRegions([...this.currentAsset.regions, newRegion]);
        this.logDrawTiming("after-update-asset-regions", { id });
        this.selectRegionImmediately(newRegion);
        this.logDrawTiming("selection-end-exit", { id });
    }

    private isTooSmallRectangle(regionData: RegionData): boolean {
        const rectangleMode = this.props.editorMode === EditorMode.Rectangle
            || this.props.editorMode === EditorMode.CopyRect;

        return rectangleMode
            && (regionData.width < Canvas.minRectangleSize || regionData.height < Canvas.minRectangleSize);
    }

    private redrawRegions = () => {
        const regionsManager = this.editor.RM as any;
        if (regionsManager.redrawAllRegions) {
            regionsManager.redrawAllRegions();
        }
    }

    private hideSelectionBox = () => {
        if (!this.canvasZone.current) {
            return;
        }

        const selectionBox = this.canvasZone.current.querySelector(".selectionBoxStyle");
        if (selectionBox) {
            selectionBox.setAttribute("visibility", "hidden");
        }
    }

    private showSelectionBoxAsSelected = () => {
        if (!this.canvasZone.current) {
            return;
        }

        const selectionBox = this.canvasZone.current.querySelector(".selectionBoxStyle") as SVGElement;
        if (!selectionBox) {
            return;
        }

        selectionBox.setAttribute("visibility", "visible");
        selectionBox.setAttribute("fill", "rgba(255, 255, 255, 0.15)");
        selectionBox.setAttribute("stroke", "#ffffff");
        selectionBox.setAttribute("stroke-width", "2");
        selectionBox.setAttribute("stroke-dasharray", "none");
        selectionBox.setAttribute("pointer-events", "none");
        this.selectionBoxHideTimer = window.setTimeout(() => this.hideSelectionBox(), 1500);
    }

    private resetSelectionBoxStyle = () => {
        if (!this.canvasZone.current) {
            return;
        }

        const selectionBox = this.canvasZone.current.querySelector(".selectionBoxStyle") as SVGElement;
        if (!selectionBox) {
            return;
        }

        selectionBox.removeAttribute("fill");
        selectionBox.removeAttribute("stroke");
        selectionBox.removeAttribute("stroke-width");
        selectionBox.removeAttribute("stroke-dasharray");
        selectionBox.removeAttribute("pointer-events");
    }

    private clearSelectionBoxHideTimer = () => {
        if (this.selectionBoxHideTimer) {
            window.clearTimeout(this.selectionBoxHideTimer);
            this.selectionBoxHideTimer = null;
        }
    }

    private selectRegionImmediately = (region: IRegion) => {
        const selectStart = performance.now();
        this.editor.RM.selectRegionById(region.id);
        this.forceSelectedRegionStyle(region.id);
        this.forceCanvasRepaint();
        this.logDrawTiming("select-region-sync", {
            duration: Math.round((performance.now() - selectStart) * 100) / 100,
            id: region.id,
            selectedDom: this.hasSelectedRegionDom(region.id),
            regionDom: this.getRegionDomSnapshot(region.id),
        });
        this.scheduleRegionDomSnapshots(region.id);
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged([region]);
        }
        window.requestAnimationFrame(() => {
            const rafSelectStart = performance.now();
            this.editor.RM.selectRegionById(region.id);
            this.forceSelectedRegionStyle(region.id);
            this.forceCanvasRepaint();
            this.logDrawTiming("select-region-raf", {
                duration: Math.round((performance.now() - rafSelectStart) * 100) / 100,
                id: region.id,
                selectedDom: this.hasSelectedRegionDom(region.id),
                regionDom: this.getRegionDomSnapshot(region.id),
            });
            if (this.props.onSelectedRegionsChanged) {
                this.props.onSelectedRegionsChanged([region]);
            }
        });
    }

    private forceSelectedRegionStyle = (id: string) => {
        const regionsManager = this.editor.RM as any;
        if (!regionsManager.lookupRegionByID) {
            return;
        }

        const region = regionsManager.lookupRegionByID(id);
        if (region && region.node) {
            region.isSelected = true;
            region.node.addClass("selected");
        }
    }

    private hasSelectedRegionDom = (id: string): boolean => {
        const regionsManager = this.editor.RM as any;
        if (!regionsManager.lookupRegionByID) {
            return false;
        }

        const region = regionsManager.lookupRegionByID(id);
        return !!region && !!region.node && !!region.node.hasClass && region.node.hasClass("selected");
    }

    private getRegionDomSnapshot = (id: string): object => {
        const regionsManager = this.editor.RM as any;
        if (!regionsManager.lookupRegionByID) {
            return {};
        }

        const region = regionsManager.lookupRegionByID(id);
        const snapNode = region && region.node;
        const domNode = snapNode && snapNode.node;
        if (!snapNode || !domNode) {
            return { exists: false };
        }

        const computedStyle = window.getComputedStyle(domNode);
        return {
            className: domNode.getAttribute("class"),
            display: computedStyle.display,
            exists: true,
            opacity: computedStyle.opacity,
            stroke: snapNode.attr ? snapNode.attr("stroke") : domNode.getAttribute("stroke"),
            strokeDasharray: snapNode.attr ? snapNode.attr("stroke-dasharray") : domNode.getAttribute("stroke-dasharray"),
            visibility: computedStyle.visibility,
        };
    }

    private scheduleRegionDomSnapshots = (id: string) => {
        window.requestAnimationFrame(() => {
            this.logDrawTiming("region-dom-snapshot-raf1", {
                id,
                regionDom: this.getRegionDomSnapshot(id),
            });
            window.requestAnimationFrame(() => {
                this.logDrawTiming("region-dom-snapshot-raf2", {
                    id,
                    regionDom: this.getRegionDomSnapshot(id),
                });
            });
        });
        window.setTimeout(() => {
            this.logDrawTiming("region-dom-snapshot-100ms", {
                id,
                regionDom: this.getRegionDomSnapshot(id),
            });
        }, 100);
    }

    private forceCanvasRepaint = () => {
        if (!this.canvasZone.current) {
            return;
        }

        const canvasZone = this.canvasZone.current;
        const currentTransform = canvasZone.style.transform;
        canvasZone.style.transform = currentTransform || "translateZ(0)";
        void canvasZone.getBoundingClientRect();
        window.requestAnimationFrame(() => {
            if (canvasZone.style.transform === "translateZ(0)") {
                canvasZone.style.transform = "";
            }
        });
    }

    private installImmediateRectPointerUp = () => {
        const areaSelector = this.editor.AS as any;
        const rectSelector = areaSelector && areaSelector.rectSelector;
        if (!rectSelector || !rectSelector.parentNode || this.rectPointerUpHandler) {
            return;
        }

        this.rectPointerUpHandler = (event: PointerEvent) => {
            const activeSelector = areaSelector.selector;
            if (activeSelector !== rectSelector
                || !rectSelector.isEnabled
                || !rectSelector.capturingState
                || rectSelector.isTwoPoints) {
                return;
            }

            this.logDrawTiming("pointerup-capture", {
                clientX: event.clientX,
                clientY: event.clientY,
            });
            event.preventDefault();
            event.stopImmediatePropagation();

            const rect = rectSelector.parentNode.getClientRects();
            if (!rect || !rect.length) {
                return;
            }

            const p = new Point2D(event.clientX - rect[0].left, event.clientY - rect[0].top);
            rectSelector.moveCross(rectSelector.crossB, p, rectSelector.selectionModificator === 1, rectSelector.crossA);
            rectSelector.moveSelectionBox(rectSelector.selectionBox, rectSelector.crossA, rectSelector.crossB);
            rectSelector.capturingState = false;

            try {
                rectSelector.parentNode.releasePointerCapture(event.pointerId);
            } catch (error) {
                // Pointer capture can already be gone on some Electron/macOS paths.
            }

            this.hideSelectorElement(rectSelector.crossB);
            this.hideSelectorElement(rectSelector.mask);
            this.hideSelectorElement(rectSelector.selectionBox);

            if (typeof rectSelector.callbacks.onSelectionEnd === "function") {
                const x = Math.min(rectSelector.crossA.x, rectSelector.crossB.x);
                const y = Math.min(rectSelector.crossA.y, rectSelector.crossB.y);
                const width = Math.abs(rectSelector.crossA.x - rectSelector.crossB.x);
                const height = Math.abs(rectSelector.crossA.y - rectSelector.crossB.y);
                this.logDrawTiming("pointerup-before-callback", { height, width, x, y });
                rectSelector.callbacks.onSelectionEnd(RegionData.BuildRectRegionData(x, y, width, height));
                this.logDrawTiming("pointerup-after-callback");
            }
        };

        rectSelector.parentNode.addEventListener("pointerup", this.rectPointerUpHandler, true);
    }

    private uninstallImmediateRectPointerUp = () => {
        const areaSelector = this.editor && this.editor.AS as any;
        const rectSelector = areaSelector && areaSelector.rectSelector;
        if (rectSelector && rectSelector.parentNode && this.rectPointerUpHandler) {
            rectSelector.parentNode.removeEventListener("pointerup", this.rectPointerUpHandler, true);
        }
        this.rectPointerUpHandler = null;
    }

    private hideSelectorElement = (element: any) => {
        if (!element) {
            return;
        }

        if (element.hide) {
            element.hide();
        } else if (element.node) {
            element.node.setAttribute("visibility", "hidden");
        }
    }

    private startDrawTiming = (label: string) => {
        const now = performance.now();
        this.drawTimingStart = now;
        this.drawTimingLast = now;
        this.drawTimingId++;
        this.logDrawTiming(label);
    }

    private logDrawTiming = (label: string, data: object = {}) => {
        const now = performance.now();
        if (!this.drawTimingStart) {
            this.drawTimingStart = now;
            this.drawTimingLast = now;
            this.drawTimingId++;
        }

        const fromStart = Math.round((now - this.drawTimingStart) * 100) / 100;
        const fromPrevious = Math.round((now - this.drawTimingLast) * 100) / 100;
        this.drawTimingLast = now;
        const entry = {
            id: this.drawTimingId,
            label,
            fromPrevious,
            fromStart,
            time: new Date().toISOString(),
            ...data,
        };
        console.info("[VoTT draw timing]", entry);
        this.writeDrawTimingLog(entry);
    }

    private initializeDrawTimingLog = () => {
        if (Canvas.drawTimingLogInitialized || !hasElectronHost()) {
            return;
        }

        Canvas.drawTimingLogInitialized = true;
        try {
            const diagnostics = getElectronHost().diagnostics;
            diagnostics.clearDrawTimingLog();
            diagnostics.writeDrawTimingLog(JSON.stringify({
                label: "log-start",
                path: diagnostics.getDrawTimingLogPath(),
                time: new Date().toISOString(),
            }));
        } catch (error) {
            console.warn(error);
        }
    }

    private writeDrawTimingLog = (entry: object) => {
        if (!hasElectronHost()) {
            return;
        }

        try {
            getElectronHost().diagnostics.writeDrawTimingLog(JSON.stringify(entry));
        } catch (error) {
            console.warn(error);
        }
    }

    /**
     * Update regions within the current asset
     * @param regions
     * @param selectedRegions
     */
    private updateAssetRegions = (regions: IRegion[]) => {
        const currentAsset: IAssetMetadata = {
            ...this.currentAsset,
            regions,
        };
        this.currentAsset = currentAsset;
        this.suppressCanvasToolsRefresh = true;
        this.setState({
            currentAsset,
        }, () => {
            this.props.onAssetMetadataChanged(currentAsset);
        });
    }

    /**
     * Method called when moving a region already in the editor
     * @param {string} id the id of the region that was moved
     * @param {RegionData} regionData the RegionData of moved region
     * @returns {void}
     */
    private onRegionMoveEnd = (id: string, regionData: RegionData) => {
        const currentRegions = this.state.currentAsset.regions;
        const movedRegionIndex = currentRegions.findIndex((region) => region.id === id);
        const movedRegion = currentRegions[movedRegionIndex];
        const scaledRegionData = this.editor.scaleRegionToSourceSize(
            regionData,
            this.state.currentAsset.asset.size.width,
            this.state.currentAsset.asset.size.height,
        );

        if (movedRegion) {
            movedRegion.points = scaledRegionData.points;
            movedRegion.boundingBox = {
                height: scaledRegionData.height,
                width: scaledRegionData.width,
                left: scaledRegionData.x,
                top: scaledRegionData.y,
            };
        }

        currentRegions[movedRegionIndex] = movedRegion;
        this.updateAssetRegions(currentRegions);
    }

    /**
     * Method called when deleting a region from the editor
     * @param {string} id the id of the deleted region
     * @returns {void}
     */
    private onRegionDelete = (id: string) => {
        if (this.selectedRegionId === id) {
            this.selectedRegionId = null;
        }

        // Remove from Canvas Tools
        this.editor.RM.deleteRegionById(id);

        // Remove from project
        const currentRegions = this.state.currentAsset.regions;
        const deletedRegionIndex = currentRegions.findIndex((region) => region.id === id);
        currentRegions.splice(deletedRegionIndex, 1);

        this.updateAssetRegions(currentRegions);
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged([]);
        }
    }

    /**
     * Method called when deleting a region from the editor
     * @param {string} id the id of the selected region
     * @param {boolean} multiSelect boolean whether region was selected with multi selection
     * @returns {void}
     */
    private onRegionSelected = (id: string, multiSelect: boolean) => {
        if (!id) {
            if (this.selectedRegionId && !this.restoringSelectedRegion && this.regionExists(this.selectedRegionId)) {
                this.restoringSelectedRegion = true;
                this.editor.RM.selectRegionById(this.selectedRegionId);
                this.restoringSelectedRegion = false;
            }
            return;
        }

        this.selectedRegionId = id;
        const selectedRegions = this.getSelectedRegions();
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged(selectedRegions);
        }
        // Gets the scaled region data
        const selectedRegionsData = this.editor.RM.getSelectedRegionsBounds().find((region) => region.id === id);

        if (selectedRegionsData) {
            this.template = new Rect(selectedRegionsData.width, selectedRegionsData.height);
        }

        if (this.props.lockedTags && this.props.lockedTags.length) {
            for (const selectedRegion of selectedRegions) {
                selectedRegion.tags = CanvasHelpers.addAllIfMissing(selectedRegion.tags, this.props.lockedTags);
            }
            this.updateRegions(selectedRegions);
        }
    }

    private regionExists = (id: string): boolean => {
        return !!this.currentAsset
            && !!this.currentAsset.regions
            && this.currentAsset.regions.some((region) => region.id === id);
    }

    private renderChildren = () => {
        return React.cloneElement(this.props.children, {
            onAssetChanged: this.onAssetChanged,
            onLoaded: this.onAssetLoaded,
            onError: this.onAssetError,
            onActivated: this.onAssetActivated,
            onDeactivated: this.onAssetDeactivated,
        });
    }

    /**
     * Raised when the asset bound to the asset preview has changed
     */
    private onAssetChanged = () => {
        this.setState({ enabled: false });
    }

    /**
     * Raised when the underlying asset has completed loading
     */
    private onAssetLoaded = (contentSource: ContentSource) => {
        this.setState({ contentSource });
        this.positionCanvas(contentSource);
    }

    private onAssetError = () => {
        this.setState({
            enabled: false,
        });
    }

    /**
     * Raised when the asset is taking control over the rendering
     */
    private onAssetActivated = () => {
        this.setState({ enabled: false });
    }

    /**
     * Raise when the asset is handing off control of rendering
     */
    private onAssetDeactivated = (contentSource: ContentSource) => {
        this.setState({
            contentSource,
            enabled: true,
        });
    }

    /**
     * Set the loaded asset content source into the canvas tools canvas
     */
    private setContentSource = async (contentSource: ContentSource) => {
        try {
            await this.editor.addContentSource(contentSource as any);

            if (this.props.onCanvasRendered) {
                const canvas = this.canvasZone.current.querySelector("canvas");
                this.props.onCanvasRendered(canvas);
            }
        } catch (e) {
            console.warn(e);
        }
    }

    /**
     * Positions the canvas tools drawing surface to be exactly over the asset content
     */
    private positionCanvas = (contentSource: ContentSource) => {
        if (!contentSource) {
            return;
        }

        this.fitImageContentSource(contentSource);

        const canvas = this.canvasZone.current;
        if (canvas) {
            const boundingBox = createContentBoundingBox(contentSource);
            canvas.style.top = `${boundingBox.top}px`;
            canvas.style.left = `${boundingBox.left}px`;
            canvas.style.width = `${boundingBox.width}px`;
            canvas.style.height = `${boundingBox.height}px`;
            this.editor.resize(boundingBox.width, boundingBox.height);
        }
    }

    private fitImageContentSource = (contentSource: ContentSource) => {
        if (!(contentSource instanceof HTMLImageElement)) {
            return;
        }

        const container = contentSource.parentElement;
        if (!container || !contentSource.naturalWidth || !contentSource.naturalHeight) {
            return;
        }

        const widthScale = container.clientWidth / contentSource.naturalWidth;
        const heightScale = container.clientHeight / contentSource.naturalHeight;
        const scale = Math.min(widthScale, heightScale);

        contentSource.style.width = `${contentSource.naturalWidth * scale}px`;
        contentSource.style.height = `${contentSource.naturalHeight * scale}px`;
    }

    /**
     * Resizes and re-renders the canvas when the application window size changes
     */
    private onWindowResize = async () => {
        if (!this.state.contentSource) {
            return;
        }

        this.positionCanvas(this.state.contentSource);
    }

    /**
     * Updates regions in both Canvas Tools and the asset data store
     * @param updates Regions to be updated
     * @param updatedSelectedRegions Selected regions with any changes already applied
     */
    private updateRegions = (updates: IRegion[]) => {
        const updatedRegions = CanvasHelpers.updateRegions(this.state.currentAsset.regions, updates);
        for (const update of updates) {
            this.editor.RM.updateTagsById(update.id, CanvasHelpers.getTagsDescriptor(this.props.project.tags, update));
        }
        this.updateAssetRegions(updatedRegions);
        this.updateCanvasToolsRegionTags();
    }

    /**
     * Updates the background of the canvas and draws the asset's regions
     */
    private clearAllRegions = () => {
        this.editor.RM.deleteAllRegions();
    }

    private refreshCanvasToolsRegions = () => {
        this.clearAllRegions();

        if (!this.currentAsset.regions || this.currentAsset.regions.length === 0) {
            return;
        }

        // Add regions to the canvas
        this.currentAsset.regions.forEach((region: IRegion) => {
            const loadedRegionData = CanvasHelpers.getRegionData(region);
            this.editor.RM.addRegion(
                region.id,
                this.editor.scaleRegionToFrameSize(
                    loadedRegionData,
                    this.state.currentAsset.asset.size.width,
                    this.state.currentAsset.asset.size.height,
                ),
                CanvasHelpers.getTagsDescriptor(this.props.project.tags, region));
        });
    }

    private editorModeToType = (editorMode: EditorMode) => {
        let type;
        switch (editorMode) {
            case EditorMode.CopyRect:
            case EditorMode.Rectangle:
                type = RegionType.Rectangle;
                break;
            case EditorMode.Polygon:
                type = RegionType.Polygon;
                break;
            case EditorMode.Point:
                type = RegionType.Point;
                break;
            case EditorMode.Polyline:
                type = RegionType.Polyline;
                break;
            default:
                break;
        }
        return type;
    }
}
