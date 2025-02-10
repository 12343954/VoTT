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

/**
 * Props for App Settings Page
 * @member appSettings - Current Application settings
 * @member connections - Application connections
 * @member actions - Application actions
 */
export interface IAppSettingsProps extends RouteComponentProps, React.Props<AppSettingsPage> {
    appSettings: IAppSettings;
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

    private switchLanguage = async (e) => {
        await this.props.actions.saveAppSettings({
            ...this.props.appSettings,
            language: e.target.value,
        });
    }
}
