import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import IApplicationActions, * as applicationActions from "../../../../redux/actions/applicationActions";
import { IApplicationState, IAppSettings } from "../../../../models/applicationState";
import "./appSettingsPage.scss";
import { strings, languages } from "../../../../common/strings";
import { AppSettingsForm } from "./appSettingsForm";
import { RouteComponentProps } from "react-router-dom";
import { toast } from "react-toastify";
import { appInfo } from "../../../../common/appInfo";
import { isElectron } from "../../../../common/hostProcess";
import { getElectronHost, hasElectronHost } from "../../../../common/electronHost";
import { DEFAULT_TAG_HOTKEYS, getTagHotkeys } from "../../../../common/tagHotkeys";
import { IProject } from "../../../../models/applicationState";

/**
 * Props for App Settings Page
 * @member appSettings - Current Application settings
 * @member connections - Application connections
 * @member actions - Application actions
 */
export interface IAppSettingsProps extends RouteComponentProps, React.Props<AppSettingsPage> {
    appSettings: IAppSettings;
    currentProject: IProject;
    actions: IApplicationActions;
}

/**
 * State for App Settings Page
 * @member formSchema - JSON Form Schema for page
 * @member uiSchema - JSON Form UI Schema for page
 * @member appSettings - Application settings
 */
function mapStateToProps(state: IApplicationState) {
    return {
        appSettings: state.appSettings,
        currentProject: state.currentProject,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(applicationActions, dispatch),
    };
}

/**
 * Page for viewing and editing application settings
 */
@connect(mapStateToProps, mapDispatchToProps)
export default class AppSettingsPage extends React.Component<IAppSettingsProps> {
    constructor(props: IAppSettingsProps) {
        super(props);

        this.toggleDevTools = this.toggleDevTools.bind(this);
        this.reloadApp = this.reloadApp.bind(this);
        this.openDrawTimingLog = this.openDrawTimingLog.bind(this);
        this.onFormSubmit = this.onFormSubmit.bind(this);
        this.onFormCancel = this.onFormCancel.bind(this);
    }

    public render() {
        return (
            <div className="app-settings-page">
                <AppSettingsForm
                    appSettings={this.props.appSettings}
                    onSubmit={this.onFormSubmit}
                    onCancel={this.onFormCancel} />
                <div className="app-settings-page-sidebar p-3 bg-lighter-1">
                    <div className="my-3">
                        <p>{`${strings.appSettings.version.description} ${appInfo.version}`}</p>
                    </div>
                    <div className="my-3">
                        <p>{`${strings.appSettings.commit}: `} {process.env.REACT_APP_COMMIT_SHA}</p>
                    </div>
                    {isElectron() &&
                        <span>
                            <div className="my-3">
                                <p>{strings.appSettings.devTools.description}</p>
                                <button id="toggleDevTools" className="btn btn-primary btn-sm"
                                    onClick={this.toggleDevTools}>{strings.appSettings.devTools.button}</button>
                            </div>
                            <div className="my-3">
                                <p>{strings.appSettings.reload.description}</p>
                                <button id="refreshApp" className="btn btn-primary btn-sm"
                                    onClick={this.reloadApp}>{strings.appSettings.reload.button}</button>
                            </div>
                            <div className="my-3">
                                <p>{strings.appSettings.drawLog.description}</p>
                                <button id="openDrawTimingLog" className="btn btn-primary btn-sm"
                                    onClick={this.openDrawTimingLog}>{strings.appSettings.drawLog.button}</button>
                            </div>
                            <div className="my-3">
                                <p>{strings.appSettings.errorLog.description}</p>
                                <button id="openErrorLog" className="btn btn-primary btn-sm"
                                    onClick={this.openErrorLog}>{strings.appSettings.errorLog.button}</button>
                            </div>
                            {this.renderShortcuts()}
                            <hr />
                            <div className="my-3 mt-3">
                                <div className="form-group row">
                                    {/* <p>{strings.appSettings.language.description}</p> */}
                                    <label className="col-sm-5 col-form-label">
                                        {strings.appSettings.language.description}
                                    </label>
                                    <div className="col-sm-6">
                                        <select id="switchLanguage" className="form-control"
                                            style={{ maxWidth: '120px' }}
                                            value={this.props.appSettings.language}
                                            onChange={(e) => this.switchLanguage(e)}>
                                            {Object.keys(languages).map((language) =>
                                                <option
                                                    className="connection-option"
                                                    key={language}
                                                    value={language}>{languages[language]}
                                                </option>)
                                            }
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </span>
                    }
                </div>
            </div>
        );
    }

    private async onFormSubmit(appSettings: IAppSettings) {
        await this.props.actions.saveAppSettings(appSettings);
        toast.success(strings.appSettings.messages.saveSuccess);
        this.props.history.goBack();
    }

    private onFormCancel() {
        this.props.history.goBack();
    }

    private toggleDevTools = async () => {
        await this.props.actions.toggleDevTools(!this.props.appSettings.devToolsEnabled);
    }

    private reloadApp = async () => {
        await this.props.actions.reloadApplication();
    }

    private openDrawTimingLog = () => {
        if (hasElectronHost()) {
            getElectronHost().diagnostics.openDrawTimingLog();
        }
    }

    private openErrorLog = () => {
        if (hasElectronHost()) {
            getElectronHost().diagnostics.openErrorLog();
        }
    }

    private renderShortcuts() {
        const project = this.props.currentProject;
        const tags = project && project.tags ? project.tags : [];
        const tagHotkeys = getTagHotkeys(this.props.appSettings, tags);
        const shortcutGroups = this.getShortcutGroups();

        return (
            <div className="my-3 app-settings-shortcuts">
                <p>{strings.appSettings.shortcuts.title}</p>
                {shortcutGroups.map((group) =>
                    <div className="app-settings-shortcuts-section" key={group.title}>
                        <h6>{group.title}</h6>
                        {group.shortcuts.map((shortcut) => this.renderShortcutRow(shortcut.keys, shortcut.description))}
                    </div>,
                )}
                <div className="app-settings-shortcuts-section">
                    <h6>{strings.appSettings.shortcuts.projectTags}</h6>
                    {tags.length > 0 ?
                        tags.map((tag, index) => this.renderShortcutRow(
                            tagHotkeys[index] || "-",
                            tag.name,
                        ))
                        :
                        <div className="app-settings-shortcut-empty">
                            {strings.appSettings.shortcuts.defaultSequence}: {DEFAULT_TAG_HOTKEYS.join(", ")}
                        </div>
                    }
                    {tags.length > 0 &&
                        <div className="app-settings-shortcut-hint">
                            {strings.appSettings.shortcuts.lockHint}
                        </div>
                    }
                </div>
            </div>
        );
    }

    private getShortcutGroups() {
        return [
            {
                title: strings.appSettings.shortcuts.annotation,
                shortcuts: [
                    { keys: "V", description: strings.appSettings.shortcuts.selectTool },
                    { keys: "R", description: strings.appSettings.shortcuts.drawRectangle },
                    { keys: "P", description: strings.appSettings.shortcuts.drawPolygon },
                    { keys: "Q", description: strings.appSettings.shortcuts.runAiDetection },
                    { keys: "Ctrl + W", description: strings.appSettings.shortcuts.copyRectangle },
                    { keys: "Ctrl + C", description: strings.appSettings.shortcuts.copyRegions },
                    { keys: "Ctrl + X", description: strings.appSettings.shortcuts.cutRegions },
                    { keys: "Ctrl + V", description: strings.appSettings.shortcuts.pasteRegions },
                    { keys: "Ctrl + Delete / Backspace", description: strings.appSettings.shortcuts.removeAllRegions },
                    { keys: "A / ArrowLeft", description: strings.appSettings.shortcuts.videoStepBack },
                    { keys: "D / ArrowRight", description: strings.appSettings.shortcuts.videoStepForward },
                    { keys: "E", description: strings.appSettings.shortcuts.videoStepForward },
                ],
            },
            {
                title: strings.appSettings.shortcuts.projectManagement,
                shortcuts: [
                    { keys: "W / ArrowUp", description: strings.appSettings.shortcuts.previousAsset },
                    { keys: "S / ArrowDown", description: strings.appSettings.shortcuts.nextAsset },
                    { keys: "Ctrl + S", description: strings.appSettings.shortcuts.saveProject },
                    { keys: "Ctrl + E", description: strings.appSettings.shortcuts.exportProject },
                    { keys: "Ctrl + D", description: strings.appSettings.shortcuts.activeLearning },
                ],
            },
            {
                title: strings.appSettings.shortcuts.application,
                shortcuts: [
                    { keys: "Ctrl + H", description: strings.appSettings.shortcuts.help },
                    { keys: "Ctrl + R", description: strings.appSettings.shortcuts.reloadApplication },
                    { keys: "Ctrl + Shift + I", description: strings.appSettings.shortcuts.toggleDeveloperTools },
                    { keys: "F11", description: strings.appSettings.shortcuts.toggleFullScreen },
                    { keys: "Esc", description: strings.appSettings.shortcuts.exitFullScreen },
                ],
            },
        ];
    }

    private renderShortcutRow(keys: string, description: string) {
        return (
            <div className="app-settings-shortcut-row" key={`${keys}-${description}`}>
                <span className="app-settings-shortcut-keys">{keys}</span>
                <span className="app-settings-shortcut-description">{description}</span>
            </div>
        );
    }

    private switchLanguage = async (e) => {
        await this.props.actions.saveAppSettings({
            ...this.props.appSettings,
            language: e.target.value,
        });
    }
}
