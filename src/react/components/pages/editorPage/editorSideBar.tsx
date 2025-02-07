import React from "react";
import { AutoSizer, List } from "react-virtualized";
import { IAsset, AssetState, ISize } from "../../../../models/applicationState";
import { AssetPreview } from "../../common/assetPreview/assetPreview";
import { strings } from "../../../../common/strings";

/**
 * Properties for Editor Side Bar
 * @member assets - Array of assets to be previewed
 * @member onAssetSelected - Function to call when asset from side bar is selected
 * @member selectedAsset - Asset initially selected
 * @member thumbnailSize - The size of the asset thumbnails
 */
export interface IEditorSideBarProps {
    assets: IAsset[];
    onAssetSelected: (asset: IAsset) => void;
    onBeforeAssetSelected?: () => boolean;
    selectedAsset?: IAsset;
    thumbnailSize?: ISize;

    // callback to parent node, smith added 2024-4-8
    onSidebarChangeSearchWord?: (words: string) => void;
    // callback to parent node, smith added 2024-4-8
    onSidebarChangeAsstesState?: (state: AssetState) => void;
}

/**
 * State for Editor Side Bar
 * @member selectedAsset - Asset selected from side bar
 */
export interface IEditorSideBarState {
    scrollToIndex: number;
    search?: string;
    assetsState?: AssetState;
    assets: IAsset[],
}

/**
 * @name - Editor Side Bar
 * @description - Side bar for editor page
 */
export default class EditorSideBar extends React.Component<IEditorSideBarProps, IEditorSideBarState> {

    public state: IEditorSideBarState = {
        scrollToIndex: this.props.selectedAsset
            ? this.props.assets.findIndex((asset) => asset.id === this.props.selectedAsset.id)
            : 0,
        search: '',
        assetsState: AssetState.None,
        assets: [],
    };

    private listRef: React.RefObject<List> = React.createRef();

    public render() {
        return (
            <div className="editor-page-sidebar-nav">
                <div className="editor-page-content-main-header">
                    <div className="btn-toolbar" role="toolbar" style={{ margin: '10px' }}>
                        <input type="search" style={{ flex: 1, minWidth: 0, backgroundColor: 'black', color: 'white', border: '1px solid black', paddingLeft: '4px' }}
                            maxLength={50}
                            onChange={(event) => this.onChangeSearch(event)} />
                        <button type="button"
                            className={`toolbar-btn ${this.state.assetsState == AssetState.Visited ? 'active' : ''}`}
                            title="Visited"
                            onClick={(event: any) => this.showAssetsWithState(event)}>
                            <i className="far fa-eye"></i>
                        </button>
                    </div>
                </div>
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            ref={this.listRef}
                            className="asset-list"
                            height={height - 78}
                            width={width}
                            rowCount={this.props.assets.length}
                            // rowCount={this.state.assets.length}
                            rowHeight={() => this.getRowHeight(width)}
                            rowRenderer={this.rowRenderer}
                            overscanRowCount={2}
                            scrollToIndex={this.state.scrollToIndex}
                        />
                    )}
                </AutoSizer>
            </div>
        );
    }

    public componentDidUpdate(prevProps: IEditorSideBarProps) {
        if (prevProps.thumbnailSize !== this.props.thumbnailSize) {
            this.listRef.current.recomputeRowHeights();
        }

        if (!prevProps.selectedAsset && !this.props.selectedAsset) {
            return;
        }

        if ((!prevProps.selectedAsset && this.props.selectedAsset) ||
            prevProps.selectedAsset.id !== this.props.selectedAsset.id) {
            this.selectAsset(this.props.selectedAsset);
        }
    }

    // callback to parent node, smith added 2024-4-8
    private showAssetsWithState = async (event: any) => {
        if (this.state.assetsState == AssetState.None)
            await this.setState({ assetsState: AssetState.Visited })
        else if (this.state.assetsState == AssetState.Visited)
            await this.setState({ assetsState: AssetState.None })

        if (this.props.onSidebarChangeAsstesState)
            this.props.onSidebarChangeAsstesState(this.state.assetsState)
    }

    // callback to parent node, smith added 2024-4-8
    private onChangeSearch = async (event: any) => {
        await this.setState({ search: event.target.value })

        if (this.props.onSidebarChangeSearchWord)
            this.props.onSidebarChangeSearchWord(this.state.search);
    }

    private getRowHeight = (width: number) => {
        return width / (4 / 3) + 16;
    }

    private selectAsset = (selectedAsset: IAsset): void => {
        const scrollToIndex = this.props.assets.findIndex((asset) => asset.id === selectedAsset.id);

        this.setState({
            scrollToIndex,
        }, () => {
            this.listRef.current.forceUpdateGrid();
        });
    }

    private onAssetClicked = (asset: IAsset): void => {
        if (this.props.onBeforeAssetSelected) {
            if (!this.props.onBeforeAssetSelected()) {
                return;
            }
        }

        this.selectAsset(asset);
        this.props.onAssetSelected(asset);
    }

    private rowRenderer = ({ key, index, style }): JSX.Element => {
        const asset = this.props.assets[index];
        // const asset = this.state.assets[index];
        const selectedAsset = this.props.selectedAsset;

        return (
            <div key={key} style={style}
                className={this.getAssetCssClassNames(asset, selectedAsset)}
                onClick={() => this.onAssetClicked(asset)}>
                <div className="asset-item-image">
                    <span className="badge index">{index + 1}</span>
                    {this.renderBadges(asset)}
                    <AssetPreview asset={asset} />
                </div>
                <div className="asset-item-metadata">
                    <span className="asset-filename" title={asset.name}>{asset.name}</span>
                    {asset.size &&
                        <span>
                            {asset.size.width} x {asset.size.height}
                        </span>
                    }
                </div>
            </div>
        );
    }

    private renderBadges = (asset: IAsset): JSX.Element => {
        switch (asset.state) {
            case AssetState.Tagged:
                return (
                    <span title={strings.editorPage.tagged}
                        className="badge badge-tagged">
                        <i className="fas fa-tag"></i>
                    </span>
                );
            case AssetState.Visited:
                return (
                    <span title={strings.editorPage.visited}
                        className="badge badge-visited">
                        <i className="fas fa-eye"></i>
                    </span>
                );
            default:
                return null;
        }
    }

    private getAssetCssClassNames = (asset: IAsset, selectedAsset: IAsset = null): string => {
        const cssClasses = ["asset-item"];
        if (selectedAsset && selectedAsset.id === asset.id) {
            cssClasses.push("selected");
        }

        return cssClasses.join(" ");
    }
}
