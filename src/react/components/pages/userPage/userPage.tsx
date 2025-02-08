import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { RouteComponentProps } from "react-router-dom";
import { toast } from "react-toastify";

import { IApplicationState, IUser } from "../../../../models/applicationState";
import IUserActions, * as userActions from "../../../../redux/actions/userActions";
import UserLoginForm from "../../common/user/userLoginForm";

import { strings } from "../../../../common/strings";
import { generateKey, encrypt } from "../../../../common/crypto";

/**
 * Props for App Settings Page
 * @member appSettings - Current Application settings
 * @member connections - Application connections
 * @member actions - Application actions
 */
export interface IUserPageProps extends RouteComponentProps, React.Props<UserPage> {
    user: IUser;
    actions: IUserActions;
}

/**
 * State for App Settings Page
 * @member formSchema - JSON Form Schema for page
 * @member uiSchema - JSON Form UI Schema for page
 * @member appSettings - Application settings
 */
function mapStateToProps(state: IApplicationState) {
    return {
        user: state.user,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(userActions, dispatch),
    };
}

export interface IUserPageState {
    isOpenLoginForm: boolean;
    modalHeader?: string;
}

@connect(mapStateToProps, mapDispatchToProps)
export default class UserPage extends React.Component<IUserPageProps, IUserPageState>{
    constructor(props: IUserPageProps) {
        super(props);

        this.state = {
            isOpenLoginForm: false,
            modalHeader: strings.user.button.login,
        }
    }

    public render() {
        return (
            <div className="app-settings-page">
                <div className="app-settings-page-form p-3">
                    <h3 className="mb-3">
                        <i className="fas fa-user fa-1x"></i>
                        <span className="px-2">{strings.user.title}</span>
                    </h3>
                    <div className="m-3">
                        <div className="ml-3">
                            {this.props.user ? null :
                                <button type="submit" className="btn btn-success mr-1"
                                    onClick={() => this.openUserLoginForm()}>
                                    {strings.user.button.login}
                                </button>}
                        </div>
                        {!this.props.user ? null :
                            <div className="d-flex mt-3 justify-content-between align-items-baseline">
                                <span className="h1">
                                    <span className="p h1 ml-3 text-info">{this.props.user.account || ''}</span>
                                </span>
                                <button className="btn btn-primary" onClick={() => this.useLogout()}>
                                    {strings.user.button.logout}</button>
                            </div>
                        }
                    </div>
                </div>
                <div className="app-settings-page-sidebar p-3 bg-lighter-1">

                </div>
                <UserLoginForm
                    isOpen={this.state.isOpenLoginForm}
                    modalHeader={this.state.modalHeader}
                    onSubmit={(data) => this.submitLogin(data)}
                    onCancel={() => this.closeLoginForm()} />
            </div>

        );
    }

    openUserLoginForm() {
        this.setState({ isOpenLoginForm: true })
    }

    closeLoginForm() {
        this.setState({ isOpenLoginForm: false })
    }

    private async submitLogin(user: IUser) {
        user.password = encrypt(user.password, user.account);

        await this.props.actions.updateUserInfo(user);
        toast.success(strings.user.login.success);
        this.closeLoginForm();
    }

    private async useLogout() {
        await this.props.actions.userLogout();
        toast.error(strings.user.logout.success);
    }
}
