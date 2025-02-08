import { Action, Dispatch } from "redux";
import { IpcRendererProxy } from "../../common/ipcRendererProxy";
import { ActionTypes } from "./actionTypes";
import { createPayloadAction, createAction, IPayloadAction } from "./actionCreators";
import { IAppSettings, IUser } from "../../models/applicationState";
import { IProject, IApplicationState } from "../../models/applicationState";
import { generateKey } from "../../common/crypto";

/**
 * Actions to make changes to application settings
 * @member toggleDevTools - Open or close dev tools
 * @member reloadApplication - Reload application
 */
export default interface IUserActions {
    getUserInfo(user: IUser): Promise<IUser>;
    updateUserInfo(user: IUser): IUser;
    userLogout(): Promise<void>;
}

//#region // Update user info
/**
 * Update user information
 */
export function getUserInfo(user: IUser): (dispatch: Dispatch) => Promise<IUser> {
    return (dispatch: Dispatch) => {
        dispatch(getUserInfoAction(user));
        // const user = getUserInfoAction();
        return Promise.resolve(user);
    };
}

/**
 * Update user information action type
 */
export interface IGetUserInfoAction extends IPayloadAction<string, IUser> {
    type: ActionTypes.GET_USERINFO_SUCCESS;
}

/**
 * Instance of update user information action
 */
export const getUserInfoAction = createPayloadAction<IGetUserInfoAction>(ActionTypes.GET_USERINFO_SUCCESS);
//#endregion


//#region // Update user info
/**
 * Update user information
 */
export function updateUserInfo(user: IUser): (dispatch: Dispatch) => Promise<IUser> {
    return (dispatch: Dispatch) => {
        dispatch(updateUserInfoAction(user));
        return Promise.resolve(user);
    };
}

/**
 * Update user information action type
 */
export interface IUpdateUserInfoAction extends IPayloadAction<string, IUser> {
    type: ActionTypes.UPDATE_USERINFO_SUCCESS;
}

/**
 * Instance of update user information action
 */
export const updateUserInfoAction = createPayloadAction<IUpdateUserInfoAction>(ActionTypes.UPDATE_USERINFO_SUCCESS);
//#endregion


//#region // User log out
/**
 * Update user information
 */
export function userLogout(): (dispatch: Dispatch) => Promise<void> {
    return (dispatch: Dispatch) => {
        dispatch(userLogoutAction());
        return Promise.resolve();
    };
}

/**
 * Update user information action type
 */
export interface IUserLogoutAction extends Action<string> {
    type: ActionTypes.LOGOUT_SUCCESS;
}

/**
 * Instance of user logout action
 */
export const userLogoutAction = createAction<IUserLogoutAction>(ActionTypes.LOGOUT_SUCCESS);
//#endregion
