import _ from "lodash";
import React, { RefObject } from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import SplitPane from "react-split-pane";
import { bindActionCreators } from "redux";
import shortid from "shortid";
import { SelectionMode } from "vott-ct/lib/js/CanvasTools/Interface/ISelectorSettings";
import HtmlFileReader from "../../../../common/htmlFileReader";
import { strings } from "../../../../common/strings";
import {
    AssetState, AssetType, EditorMode, IApplicationState,
    IAppSettings, IAsset, IAssetMetadata, IProject, IRegion,
    ISize, ITag, IAdditionalPageSettings, AppError, ErrorCode,
    RegionType,
    IUser,
} from "../../../../models/applicationState";
import { IToolbarItemRegistration, ToolbarItemFactory } from "../../../../providers/toolbar/toolbarItemFactory";
import IApplicationActions, * as applicationActions from "../../../../redux/actions/applicationActions";
import IProjectActions, * as projectActions from "../../../../redux/actions/projectActions";
import { ToolbarItemName } from "../../../../registerToolbar";
import { AssetService } from "../../../../services/assetService";
import { AssetPreview } from "../../common/assetPreview/assetPreview";
import { KeyboardBinding } from "../../common/keyboardBinding/keyboardBinding";
import { KeyEventType } from "../../common/keyboardManager/keyboardManager";
import { TagInput } from "../../common/tagInput/tagInput";
import { ToolbarItem } from "../../toolbar/toolbarItem";
import Canvas from "./canvas";
import CanvasHelpers from "./canvasHelpers";
import "./editorPage.scss";
import EditorSideBar from "./editorSideBar";
import { EditorToolbar } from "./editorToolbar";
import Alert from "../../common/alert/alert";
import Confirm from "../../common/confirm/confirm";
import { ActiveLearningService } from "../../../../services/activeLearningService";
import { toast } from "react-toastify";

import Yolov3Service from '../../../../services/yolov3Service'

/**
 * Properties for Editor Page
 * @member project - Project being edited
 * @member recentProjects - Array of projects recently viewed/edited
 * @member actions - Project actions
 * @member applicationActions - Application setting actions
 */
export interface IEditorPageProps extends RouteComponentProps, React.Props<EditorPage> {
    user?: IUser;
    project: IProject;
    recentProjects: IProject[];
    appSettings: IAppSettings;
    actions: IProjectActions;
    applicationActions: IApplicationActions;
}

/**
 * State for Editor Page
 */
export interface IEditorPageState {
    /** Array of assets in project */
    assets: IAsset[];
    /** The editor mode to set for canvas tools */
    editorMode: EditorMode;
    /** The selection mode to set for canvas tools */
    selectionMode: SelectionMode;
    /** The selected asset for the primary editing experience */
    selectedAsset?: IAssetMetadata;
    /** Currently selected region on current asset */
    selectedRegions?: IRegion[];
    /** The child assets used for nest asset typs */
    childAssets?: IAsset[];
    /** Additional settings for asset previews */
    additionalSettings?: IAdditionalPageSettings;
    /** Most recently selected tag */
    selectedTag: string;
    /** Tags locked for region labeling */
    lockedTags: string[];
    /** Size of the asset thumbnails to display in the side bar */
    thumbnailSize: ISize;
    /**
     * Whether or not the editor is in a valid state
     * State is invalid when a region has not been tagged
     */
    isValid: boolean;
    /** Whether the show invalid region warning alert should display */
    showInvalidRegionWarning: boolean;
    /*search word from sidebar, smit added 2020-4-8*/
    searchWord: string;
    /*Assets state from sidebar, smit added 2020-4-8*/
    assetsState: AssetState;
}

function mapStateToProps(state: IApplicationState) {
    return {
        user: state.user,
        recentProjects: state.recentProjects,
        project: state.currentProject,
        appSettings: state.appSettings,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(projectActions, dispatch),
        applicationActions: bindActionCreators(applicationActions, dispatch),
    };
}

/**
 * @name - Editor Page
 * @description - Page for adding/editing/removing tags to assets
 */
@connect(mapStateToProps, mapDispatchToProps)
export default class EditorPage extends React.Component<IEditorPageProps, IEditorPageState> {
    public state: IEditorPageState = {
        selectedTag: null,
        lockedTags: [],
        selectionMode: SelectionMode.RECT,
        assets: [],
        childAssets: [],
        editorMode: EditorMode.Rectangle,
        additionalSettings: {
            videoSettings: (this.props.project) ? this.props.project.videoSettings : null,
            activeLearningSettings: (this.props.project) ? this.props.project.activeLearningSettings : null,
        },
        thumbnailSize: this.props.appSettings.thumbnailSize || { width: 175, height: 155 },
        isValid: true,
        showInvalidRegionWarning: false,
        searchWord: '',
        assetsState: AssetState.None,
    };

    private activeLearningService: ActiveLearningService = null;
    private loadingProjectAssets: boolean = false;
    private toolbarItems: IToolbarItemRegistration[] = ToolbarItemFactory.getToolbarItems();
    private canvas: RefObject<Canvas> = React.createRef();
    private renameTagConfirm: React.RefObject<Confirm> = React.createRef();
    private deleteTagConfirm: React.RefObject<Confirm> = React.createRef();

    //smith add 2024-4-2
    private yolov3Service: Yolov3Service = null;
    //smith add 2024-4-8
    private totalAssets: IAsset[] = [];

    public async componentDidMount() {
        this.refreshToolbars();

        const projectId = this.props.match.params["projectId"];
        if (this.props.project) {
            await this.loadProjectAssets();
        } else if (projectId) {
            const project = this.props.recentProjects.find((project) => project.id === projectId);
            await this.props.actions.loadProject(project);
        }

        this.activeLearningService = new ActiveLearningService(this.props.project.activeLearningSettings);
        this.yolov3Service = new Yolov3Service(this.props.project.autoDetectApi ? this.props.project.autoDetectApi : "");
    }

    private refreshToolbars() {
        setTimeout(() => {
            Object.keys(strings.editorPage.toolbar).forEach(p => {
                const selector = `.editor-page-content-main-header .toolbar-btn.${p}`;
                let item: HTMLElement = document.querySelector(selector)
                if (item) {
                    item.setAttribute("title", `${strings.editorPage.toolbar[p]}${item.getAttribute("data-shortcut")}`)
                }
            })
        }, 1000)
    }

    public async componentDidUpdate(prevProps: Readonly<IEditorPageProps>) {
        // if (prevProps.appSettings !== this.props.appSettings) {
        //     console.log("appSettings changed")
        //     this.toolbarItems = ToolbarItemFactory.getToolbarItems();
        // }

        if (this.props.project && this.state.assets.length === 0) {
            await this.loadProjectAssets();
        }

        // Navigating directly to the page via URL (ie, http://vott/projects/a1b2c3dEf/edit) sets the default state
        // before props has been set, this updates the project and additional settings to be valid once props are
        // retrieved.
        if (this.props.project && !prevProps.project) {
            this.setState({
                additionalSettings: {
                    videoSettings: (this.props.project) ? this.props.project.videoSettings : null,
                    activeLearningSettings: (this.props.project) ? this.props.project.activeLearningSettings : null,
                },
            });
        }

        if (this.props.project && prevProps.project && this.props.project.tags !== prevProps.project.tags) {
            this.updateRootAssets();
        }
    }

    public render() {
        const { project } = this.props;
        const { assets, selectedAsset } = this.state;
        const rootAssets = assets.filter((asset) => !asset.parent)

        if (!project) {
            return (<div>Loading...</div>);
        }

        return (
            <div className="editor-page">
                {[...Array(10).keys()].map((index) => {
                    return (<KeyboardBinding
                        displayName={strings.editorPage.tags.hotKey.apply}
                        key={index}
                        keyEventType={KeyEventType.KeyDown}
                        accelerators={[`${index}`]}
                        icon={"fa-tag"}
                        handler={this.handleTagHotKey} />);
                })}
                {[...Array(10).keys()].map((index) => {
                    return (<KeyboardBinding
                        displayName={strings.editorPage.tags.hotKey.lock}
                        key={index}
                        keyEventType={KeyEventType.KeyDown}
                        accelerators={[`CmdOrCtrl+${index}`]}
                        icon={"fa-lock"}
                        handler={this.handleCtrlTagHotKey} />);
                })}
                <SplitPane split="vertical"
                    defaultSize={this.state.thumbnailSize.width}
                    minSize={100}
                    maxSize={400}
                    paneStyle={{ display: "flex" }}
                    onChange={this.onSideBarResize}
                    onDragFinished={this.onSideBarResizeComplete}>
                    <div className="editor-page-sidebar bg-lighter-1">
                        <EditorSideBar
                            assets={rootAssets}
                            selectedAsset={selectedAsset ? selectedAsset.asset : null}
                            onBeforeAssetSelected={this.onBeforeAssetSelected}
                            onAssetSelected={this.selectAsset}
                            thumbnailSize={this.state.thumbnailSize}
                            onSidebarChangeSearchWord={this.onChangeSearchWordFromSidebar}
                            onSidebarChangeAsstesState={this.onChangeAsstesStateFromSidebar}
                        />
                    </div>
                    <div className="editor-page-content" onClick={this.onPageClick}>
                        <div className="editor-page-content-main">
                            <div className="editor-page-content-main-header">
                                <EditorToolbar project={this.props.project}
                                    items={this.toolbarItems}
                                    actions={this.props.actions}
                                    onToolbarItemSelected={this.onToolbarItemSelected} />
                            </div>
                            <div className="editor-page-content-main-body">
                                {selectedAsset &&
                                    <Canvas
                                        ref={this.canvas}
                                        selectedAsset={this.state.selectedAsset}
                                        onAssetMetadataChanged={this.onAssetMetadataChanged}
                                        onCanvasRendered={this.onCanvasRendered}
                                        onSelectedRegionsChanged={this.onSelectedRegionsChanged}
                                        editorMode={this.state.editorMode}
                                        selectionMode={this.state.selectionMode}
                                        project={this.props.project}
                                        lockedTags={this.state.lockedTags}>
                                        <AssetPreview
                                            additionalSettings={this.state.additionalSettings}
                                            autoPlay={true}
                                            controlsEnabled={this.state.isValid}
                                            onBeforeAssetChanged={this.onBeforeAssetSelected}
                                            onChildAssetSelected={this.onChildAssetSelected}
                                            asset={this.state.selectedAsset.asset}
                                            childAssets={this.state.childAssets} />
                                    </Canvas>
                                }
                            </div>
                        </div>
                        <div className="editor-page-right-sidebar">
                            <TagInput
                                tags={this.props.project.tags}
                                lockedTags={this.state.lockedTags}
                                selectedRegions={this.state.selectedRegions}
                                onChange={this.onTagsChanged}
                                onLockedTagsChange={this.onLockedTagsChanged}
                                onTagClick={this.onTagClicked}
                                onCtrlTagClick={this.onCtrlTagClicked}
                                onTagRenamed={this.confirmTagRenamed}
                                onTagDeleted={this.confirmTagDeleted}
                            />
                        </div>
                        <Confirm title={strings.editorPage.tags.rename.title}
                            ref={this.renameTagConfirm}
                            message={strings.editorPage.tags.rename.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onTagRenamed} />
                        <Confirm title={strings.editorPage.tags.delete.title}
                            ref={this.deleteTagConfirm}
                            message={strings.editorPage.tags.delete.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onTagDeleted} />
                    </div>
                </SplitPane>
                <Alert show={this.state.showInvalidRegionWarning}
                    title={strings.editorPage.messages.enforceTaggedRegions.title}
                    // tslint:disable-next-line:max-line-length
                    message={strings.editorPage.messages.enforceTaggedRegions.description}
                    closeButtonColor="info"
                    onClose={() => this.setState({ showInvalidRegionWarning: false })} />
            </div>
        );
    }

    // smith added 2024-4-8
    private onChangeSearchWordFromSidebar = async (word: string) => {
        // console.log(word)

        await this.setState({ searchWord: word });

        if (this.state.searchWord) {
            switch (this.state.assetsState) {
                case AssetState.None:
                    this.setState({
                        assets: this.totalAssets.filter(p => p.name.includes(this.state.searchWord))
                    })
                    break;
                case AssetState.Visited:
                    this.setState({
                        assets: this.totalAssets.filter(p => p.state == AssetState.Visited
                            && p.name.includes(this.state.searchWord))
                    })
                    break;
            }
        } else {
            switch (this.state.assetsState) {
                case AssetState.None:
                    this.setState({
                        assets: this.totalAssets
                    })
                    break;
                case AssetState.Visited:
                    this.setState({
                        assets: this.totalAssets.filter(p => p.state == AssetState.Visited)
                    })
                    break;
            }
        }
    }

    // smith added 2024-4-8
    private onChangeAsstesStateFromSidebar = async (state: AssetState) => {

        await this.setState({ assetsState: state })

        switch (this.state.assetsState) {
            case AssetState.None:
                if (this.state.searchWord) {
                    this.setState({
                        assets: this.totalAssets.filter(p => p.name.includes(this.state.searchWord))
                    })
                    break;
                } else {
                    this.setState({
                        assets: this.totalAssets
                    })
                }
                break;
            case AssetState.Visited:
                if (this.state.searchWord) {
                    this.setState({
                        assets: this.totalAssets.filter(p => p.state == AssetState.Visited
                            && p.name.includes(this.state.searchWord))
                    })
                } else {
                    this.setState({
                        assets: this.totalAssets.filter(p => p.state == AssetState.Visited)
                    })
                }
                break;
        }
    }


    private onPageClick = () => {
        this.setState({
            selectedRegions: [],
        });
    }

    /**
     * Called when the asset side bar is resized
     * @param newWidth The new sidebar width
     */
    private onSideBarResize = (newWidth: number) => {
        this.setState({
            thumbnailSize: {
                width: newWidth,
                height: newWidth / (4 / 3),
            },
        }, () => this.canvas.current.forceResize());
    }

    /**
     * Called when the asset sidebar has been completed
     */
    private onSideBarResizeComplete = () => {
        const appSettings = {
            ...this.props.appSettings,
            thumbnailSize: this.state.thumbnailSize,
        };

        this.props.applicationActions.saveAppSettings(appSettings);
    }

    /**
     * Called when a tag from footer is clicked
     * @param tag Tag clicked
     */
    private onTagClicked = (tag: ITag): void => {
        this.setState({
            selectedTag: tag.name,
            lockedTags: [],
        }, () => this.canvas.current.applyTag(tag.name));
    }

    /**
     * Open confirm dialog for tag renaming
     */
    private confirmTagRenamed = (tagName: string, newTagName: string): void => {
        this.renameTagConfirm.current.open(tagName, newTagName);
    }

    /**
     * Renames tag in assets and project, and saves files
     * @param tagName Name of tag to be renamed
     * @param newTagName New name of tag
     */
    private onTagRenamed = async (tagName: string, newTagName: string): Promise<void> => {
        const assetUpdates = await this.props.actions.updateProjectTag(this.props.project, tagName, newTagName);
        const selectedAsset = assetUpdates.find((am) => am.asset.id === this.state.selectedAsset.asset.id);

        if (selectedAsset) {
            if (selectedAsset) {
                this.setState({ selectedAsset });
            }
        }
    }

    /**
     * Open Confirm dialog for tag deletion
     */
    private confirmTagDeleted = (tagName: string): void => {
        this.deleteTagConfirm.current.open(tagName);
    }

    /**
     * Removes tag from assets and projects and saves files
     * @param tagName Name of tag to be deleted
     */
    private onTagDeleted = async (tagName: string): Promise<void> => {
        const assetUpdates = await this.props.actions.deleteProjectTag(this.props.project, tagName);
        const selectedAsset = assetUpdates.find((am) => am.asset.id === this.state.selectedAsset.asset.id);

        if (selectedAsset) {
            this.setState({ selectedAsset });
        }
    }

    private onCtrlTagClicked = (tag: ITag): void => {
        const locked = this.state.lockedTags;
        this.setState({
            selectedTag: tag.name,
            lockedTags: CanvasHelpers.toggleTag(locked, tag.name),
        }, () => this.canvas.current.applyTag(tag.name));
    }

    private getTagFromKeyboardEvent = (event: KeyboardEvent): ITag => {
        let key = parseInt(event.key, 10);
        if (isNaN(key)) {
            try {
                key = parseInt(event.key.split("+")[1], 10);
            } catch (e) {
                return;
            }
        }
        let index: number;
        const tags = this.props.project.tags;
        if (key === 0 && tags.length >= 10) {
            index = 9;
        } else if (key < 10) {
            index = key - 1;
        }
        if (index < tags.length) {
            return tags[index];
        }
        return null;
    }

    /**
     * Listens for {number key} and calls `onTagClicked` with tag corresponding to that number
     * @param event KeyDown event
     */
    private handleTagHotKey = (event: KeyboardEvent): void => {
        const tag = this.getTagFromKeyboardEvent(event);
        if (tag) {
            this.onTagClicked(tag);
        }
    }

    private handleCtrlTagHotKey = (event: KeyboardEvent): void => {
        const tag = this.getTagFromKeyboardEvent(event);
        if (tag) {
            this.onCtrlTagClicked(tag);
        }
    }

    /**
     * Raised when a child asset is selected on the Asset Preview
     * ex) When a video is paused/seeked to on a video
     */
    private onChildAssetSelected = async (childAsset: IAsset) => {
        if (this.state.selectedAsset && this.state.selectedAsset.asset.id !== childAsset.id) {
            await this.selectAsset(childAsset);
        }
    }

    /**
     * Returns a value indicating whether the current asset is taggable
     */
    private isTaggableAssetType = (asset: IAsset): boolean => {
        return asset.type !== AssetType.Unknown && asset.type !== AssetType.Video;
    }

    /**
     * Raised when the selected asset has been changed.
     * This can either be a parent or child asset
     */
    private onAssetMetadataChanged = async (assetMetadata: IAssetMetadata): Promise<void> => {
        // If the asset contains any regions without tags, don't proceed.
        const regionsWithoutTags = assetMetadata.regions.filter((region) => region.tags.length === 0);

        if (regionsWithoutTags.length > 0) {
            this.setState({ isValid: false });
            return;
        }

        const initialState = assetMetadata.asset.state;

        // The root asset can either be the actual asset being edited (ex: VideoFrame) or the top level / root
        // asset selected from the side bar (image/video).
        const rootAsset = { ...(assetMetadata.asset.parent || assetMetadata.asset) };

        if (this.isTaggableAssetType(assetMetadata.asset)) {
            assetMetadata.asset.state = assetMetadata.regions.length > 0 ? AssetState.Tagged : AssetState.Visited;
        } else if (assetMetadata.asset.state === AssetState.NotVisited) {
            assetMetadata.asset.state = AssetState.Visited;
        }

        // Update root asset if not already in the "Tagged" state
        // This is primarily used in the case where a Video Frame is being edited.
        // We want to ensure that in this case the root video asset state is accurately
        // updated to match that state of the asset.
        if (rootAsset.id === assetMetadata.asset.id) {
            rootAsset.state = assetMetadata.asset.state;
        } else {
            const rootAssetMetadata = await this.props.actions.loadAssetMetadata(this.props.project, rootAsset);

            if (rootAssetMetadata.asset.state !== AssetState.Tagged) {
                rootAssetMetadata.asset.state = assetMetadata.asset.state;
                await this.props.actions.saveAssetMetadata(this.props.project, rootAssetMetadata);
            }

            rootAsset.state = rootAssetMetadata.asset.state;
        }

        // Only update asset metadata if state changes or is different
        if (initialState !== assetMetadata.asset.state || this.state.selectedAsset !== assetMetadata) {
            if (!assetMetadata.creator && this.props.user) assetMetadata.creator = this.props.user.account;
            if (!assetMetadata.createdDate) assetMetadata.createdDate = new Date().valueOf();

            await this.props.actions.saveAssetMetadata(this.props.project, assetMetadata);
        }

        await this.props.actions.saveProject(this.props.project);

        const assetService = new AssetService(this.props.project);
        const childAssets = assetService.getChildAssets(rootAsset);

        // Find and update the root asset in the internal state
        // This forces the root assets that are displayed in the sidebar to
        // accurately show their correct state (not-visited, visited or tagged)
        const assets = [...this.state.assets];
        const assetIndex = assets.findIndex((asset) => asset.id === rootAsset.id);
        if (assetIndex > -1) {
            assets[assetIndex] = {
                ...rootAsset,
            };
        }

        this.setState({ childAssets, assets, isValid: true });
    }

    /**
     * Raised when the asset binary has been painted onto the canvas tools rendering canvas
     */
    private onCanvasRendered = async (canvas: HTMLCanvasElement) => {
        // When active learning auto-detect is enabled
        // run predictions when asset changes
        if (this.props.project.activeLearningSettings.autoDetect && !this.state.selectedAsset.asset.predicted) {
            await this.predictRegions(canvas);
        }
    }

    private onSelectedRegionsChanged = (selectedRegions: IRegion[]) => {
        if (selectedRegions.length) {
            selectedRegions = selectedRegions.map(region => {
                if (region.tags.length == 0) return region;

                if (!region.creator && this.props.user) region.creator = this.props.user.account;
                if (!region.createdDate) region.createdDate = new Date().valueOf();
                return region;
            });
        }

        this.setState({ selectedRegions });
    }

    private onTagsChanged = async (tags) => {
        const project = {
            ...this.props.project,
            tags,
        };

        await this.props.actions.saveProject(project);
    }

    private onLockedTagsChanged = (lockedTags: string[]) => {
        this.setState({ lockedTags });
    }

    private onToolbarItemSelected = async (toolbarItem: ToolbarItem): Promise<void> => {
        switch (toolbarItem.props.name) {
            case ToolbarItemName.DrawRectangle:
                this.setState({
                    selectionMode: SelectionMode.RECT,
                    editorMode: EditorMode.Rectangle,
                });
                break;
            case ToolbarItemName.DrawPolygon:
                this.setState({
                    selectionMode: SelectionMode.POLYGON,
                    editorMode: EditorMode.Polygon,
                });
                break;
            case ToolbarItemName.CopyRectangle:
                this.setState({
                    selectionMode: SelectionMode.COPYRECT,
                    editorMode: EditorMode.CopyRect,
                });
                break;
            case ToolbarItemName.SelectCanvas:
                this.setState({
                    selectionMode: SelectionMode.NONE,
                    editorMode: EditorMode.Select,
                });
                break;
            case ToolbarItemName.PreviousAsset:
                await this.goToRootAsset(-1);
                break;
            case ToolbarItemName.NextAsset:
                await this.goToRootAsset(1);
                break;
            case ToolbarItemName.CopyRegions:
                this.canvas.current.copyRegions();
                break;
            case ToolbarItemName.CutRegions:
                this.canvas.current.cutRegions();
                break;
            case ToolbarItemName.PasteRegions:
                this.canvas.current.pasteRegions();
                break;
            case ToolbarItemName.RemoveAllRegions:
                this.canvas.current.confirmRemoveAllRegions();
                break;
            case ToolbarItemName.ActiveLearning:
                await this.predictRegions();
                break;

            // smith added 2024-4-2
            case ToolbarItemName.YoloDetect:
                await this.yoloAutoDetect();
        }
    }

    // smith added 2024-4-2
    private yoloAutoDetect = async () => {
        try {
            try {
                // remove toast immediately, and show the next result smoothly
                // document.querySelectorAll('[class~="Toastify__toast--success"]').forEach((k: any) => k.style.display = 'none');
                document.querySelectorAll('[class~="Toastify__toast"]').forEach(k => k.remove())
            } catch { }

            let path = decodeURIComponent(this.state.selectedAsset.asset.path.substring(5)).replace(/\//g, '\\');
            let result = await this.yolov3Service.DetectImageAsync(encodeURIComponent(path));
            if (result.return_code) {
                if (result.data.detect) {
                    toast(<div>
                        <h4>YOLOv3 Detected</h4>
                        <div style={{ margin: `5% 10%` }}>
                            <table className="table-auto-detect-result" style={{ width: '100%' }}>
                                <thead><tr>
                                    <td style={{ width: '30px' }}></td>
                                    <td style={{ width: 'unset' }}></td>
                                    <td style={{ width: '40px' }}></td>
                                </tr>
                                </thead>
                                <tbody className={result.data.diff == 0 ? "ok" : "bad"}>
                                    {result.data.detect.sort((a, b) => a.id - b.id)
                                        .map(k => <tr key={k.id} style={{ color: k.obj_IDs.length > 1 ? 'black' : 'unset' }}
                                            onMouseEnter={() => this.onHighlightRegion(k, 'enter')}
                                            onMouseLeave={() => this.onHighlightRegion(k, 'leave')}>
                                            <td>{k.id}</td>
                                            <td>{k.obj_IDs.map(kk => kk.name).join(', ')}</td>
                                            <td>{(k.prob * 100).toFixed(2)}%</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>, {
                        position: 'top-center',
                        autoClose: result.data.diff == 0 ? 5000 : 15000,
                        type: result.data.diff == 0 ? "success" : 'warning'
                    })
                }

                let old_regions = JSON.parse(JSON.stringify(this.state.selectedAsset.regions)); // deep copy
                let new_regions: IRegion[];
                if (this.state.selectedAsset.regions.length == 0) {
                    new_regions = result.data.detect.map((k: any, i: number): IRegion => {
                        return {
                            id: shortid.generate(),
                            tags: k.obj_IDs.map(p => p.name),
                            type: RegionType.Rectangle,
                            boundingBox: { left: k.x, top: k.y, width: k.w, height: k.h },
                            points: [
                                { x: k.x, y: k.y }, // Top left
                                { x: k.x + k.w, y: k.y }, // Top Right
                                { x: k.x, y: k.y + k.h }, // Bottom Left
                                { x: k.x + k.w, y: k.y + k.h }, // Bottom Right
                            ],
                            creator: this.props.user ? this.props.user.account : "",
                            createdDate: new Date().valueOf(),
                        }
                    })
                } else {
                    // name_id, name, x, y, w, h, prob, center:"633, 171", List<id_names> obj_IDs
                    new_regions = result.data.detect.map((k: any, i: number): IRegion => {
                        let center = k.center.split(',')
                        center = { x: parseFloat(center[0]), y: parseFloat(center[1]) }

                        let exist = old_regions.filter(old => Math.hypot(
                            (center.x - 0.5 * (old.boundingBox.left + old.boundingBox.width)),
                            (center.y - 0.5 * (old.boundingBox.top + old.boundingBox.height)),
                        ) < 100)

                        if (exist.length) {
                            return {
                                ...exist,
                                ...{
                                    tags: [...exist.tags, ...k.obj_IDs.map(p => p.name)],
                                    creator: exist[0].creator || (this.props.user ? this.props.user.account : ""),
                                    createdDate: exist[0].createdDate || new Date().valueOf(),
                                }
                            }
                        } else {
                            return {
                                id: shortid.generate(),
                                tags: k.obj_IDs.map(p => p.name),
                                type: RegionType.Rectangle,
                                boundingBox: { left: k.x, top: k.y, width: k.w, height: k.h },
                                points: [
                                    { x: k.x, y: k.y }, // Top left
                                    { x: k.x + k.w, y: k.y }, // Top Right
                                    { x: k.x, y: k.y + k.h }, // Bottom Left
                                    { x: k.x + k.w, y: k.y + k.h }, // Bottom Right
                                ],
                                creator: this.props.user ? this.props.user.account : "",
                                createdDate: new Date().valueOf(),
                            }
                        }
                    })
                }
                this.setState({
                    selectedAsset: {
                        ...this.state.selectedAsset,
                        regions: new_regions,
                        asset: {
                            ...this.state.selectedAsset.asset,
                        }
                    }
                }, () => {
                    // save assetMeta data to json file...
                    this.onAssetMetadataChanged(this.state.selectedAsset);
                })
            } else {
                toast.error(result.message || "AI Auto-detect function error!")
            }
        } catch (e) {
            toast.error(e.message);
        }
    }

    // smith added 2024-4-4
    private onHighlightRegion = async (detection: any, type: string) => {
        if (!/#\/projects\/\w+\/edit/.test(window.location.hash)) {
            document.querySelectorAll('[class~="Toastify__toast"]').forEach(k => k.remove())
            return;
        }
        switch (type) {
            case 'enter':
                let center = detection.center.split(',')
                center = { x: parseFloat(center[0]), y: parseFloat(center[1]) }

                let regions: IRegion[] = this.state.selectedAsset.regions.filter(p => Math.hypot(
                    center.x - (p.points[0].x + 0.5 * (p.points[1].x - p.points[0].x)),
                    center.y - (p.points[0].y + 0.5 * (p.points[3].y - p.points[0].y))) < 100)

                // console.log('focus highlight region', regions)
                this.canvas.current.onHighlightRegions(regions)
                this.onSelectedRegionsChanged(regions)
                break;
            case 'leave':
                this.onSelectedRegionsChanged([])
                break;
        }
    }

    private predictRegions = async (canvas?: HTMLCanvasElement) => {
        canvas = canvas || document.querySelector("canvas");
        if (!canvas) {
            return;
        }

        // Load the configured ML model
        if (!this.activeLearningService.isModelLoaded()) {
            let toastId: number = null;
            try {
                toastId = toast.info(strings.activeLearning.messages.loadingModel, { autoClose: false });
                await this.activeLearningService.ensureModelLoaded();
            } catch (e) {
                toast.error(strings.activeLearning.messages.errorLoadModel);
                return;
            } finally {
                toast.dismiss(toastId);
            }
        }

        // Predict and add regions to current asset
        try {
            const updatedAssetMetadata = await this.activeLearningService
                .predictRegions(canvas, this.state.selectedAsset);

            await this.onAssetMetadataChanged(updatedAssetMetadata);
            this.setState({ selectedAsset: updatedAssetMetadata });
        } catch (e) {
            throw new AppError(ErrorCode.ActiveLearningPredictionError, "Error predicting regions");
        }
    }

    /**
     * Navigates to the previous / next root asset on the sidebar
     * @param direction Number specifying asset navigation
     */
    private goToRootAsset = async (direction: number) => {
        const selectedRootAsset = this.state.selectedAsset.asset.parent || this.state.selectedAsset.asset;
        const currentIndex = this.state.assets
            .findIndex((asset) => asset.id === selectedRootAsset.id);

        if (direction > 0) {
            await this.selectAsset(this.state.assets[Math.min(this.state.assets.length - 1, currentIndex + 1)]);
        } else {
            await this.selectAsset(this.state.assets[Math.max(0, currentIndex - 1)]);
        }
    }

    private onBeforeAssetSelected = (): boolean => {
        if (!this.state.isValid) {
            this.setState({ showInvalidRegionWarning: true });
        }

        return this.state.isValid;
    }

    private selectAsset = async (asset: IAsset): Promise<void> => {
        // Nothing to do if we are already on the same asset.
        if (this.state.selectedAsset && this.state.selectedAsset.asset.id === asset.id) {
            return;
        }

        if (!this.state.isValid) {
            this.setState({ showInvalidRegionWarning: true });
            return;
        }

        const assetMetadata = await this.props.actions.loadAssetMetadata(this.props.project, asset);

        try {
            if (!assetMetadata.asset.size) {
                const assetProps = await HtmlFileReader.readAssetAttributes(asset);
                assetMetadata.asset.size = { width: assetProps.width, height: assetProps.height };
            }
        } catch (err) {
            console.warn("Error computing asset size");
        }

        this.setState({
            selectedAsset: assetMetadata,
        }, async () => {
            await this.onAssetMetadataChanged(assetMetadata);
        });
    }

    private loadProjectAssets = async (): Promise<void> => {
        if (this.loadingProjectAssets || this.state.assets.length > 0) {
            return;
        }

        this.loadingProjectAssets = true;

        // Get all root project assets
        const rootProjectAssets = _.values(this.props.project.assets)
            .filter((asset) => !asset.parent);

        // Get all root assets from source asset provider
        const sourceAssets = await this.props.actions.loadAssets(this.props.project);

        // Merge and uniquify
        const rootAssets = _(rootProjectAssets)
            .concat(sourceAssets)
            .uniqBy((asset) => asset.id)
            .value();

        const lastVisited = rootAssets.find((asset) => asset.id === this.props.project.lastVisitedAssetId);

        this.totalAssets = rootAssets;
        this.setState({
            assets: rootAssets,
        }, async () => {
            if (rootAssets.length > 0) {
                await this.selectAsset(lastVisited ? lastVisited : rootAssets[0]);
            }
            this.loadingProjectAssets = false;
        });
    }

    /**
     * Updates the root asset list from the project assets
     */
    private updateRootAssets = () => {
        const updatedAssets = [...this.state.assets];
        updatedAssets.forEach((asset) => {
            const projectAsset = this.props.project.assets[asset.id];
            if (projectAsset) {
                asset.state = projectAsset.state;
            }
        });

        this.setState({ assets: updatedAssets });
    }
}
