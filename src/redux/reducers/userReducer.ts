import { ActionTypes } from "../actions/actionTypes";
import { IUser } from "../../models/applicationState";
import { AnyAction } from "../actions/actionCreators";

/**
 * Reducer for application settings. Actions handled:
 * TOGGLE_DEV_TOOLS_SUCCESS
 * REFRESH_APP_SUCCESS
 * @param state - Current app settings
 * @param action - Action that was dispatched
 */
export const reducer = (state: IUser = null, action: AnyAction): IUser => {
    switch (action.type) {
        case ActionTypes.GET_USERINFO_SUCCESS:
            return action.payload || null;
        case ActionTypes.UPDATE_USERINFO_SUCCESS:
            return { ...state, ...action.payload };
        case ActionTypes.LOGOUT_SUCCESS:
            localStorage.removeItem("user");
            return null;
        default:
            return state;
    }
};
