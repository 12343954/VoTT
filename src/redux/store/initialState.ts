import { IAppSettings, IApplicationState } from "../../models/applicationState";

const appSettings: IAppSettings = JSON.parse(localStorage.getItem('appSettings'));


/**
 * Initial state of application
 * @member user - Application settings
 * @member appSettings - Application settings
 * @member connections - Connections
 * @member recentProjects - Recent projects
 * @member currentProject - Current project
 */
const initialState: IApplicationState = {
    user: null,
    appSettings: {
        language: appSettings ? (appSettings.language || "en") : "en",
        devToolsEnabled: false,
        securityTokens: [],
    },
    connections: [],
    recentProjects: [],
    currentProject: null,
    appError: null,
};

/**
 * Instance of initial application state
 */
export default initialState;
