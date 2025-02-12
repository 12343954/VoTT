import React from "react";
import { Provider } from "react-redux";
import ReactDOM from "react-dom";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../node_modules/@fortawesome/fontawesome-free/css/all.css";
import "./assets/css/bootstrap-theme-slate.css";
import "./index.scss";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import createReduxStore from "./redux/store/store";
import initialState from "./redux/store/initialState";
import { IApplicationState } from "./models/applicationState";
import registerProviders from "./registerProviders";
import registerMixins from "./registerMixins";

import { setUpAppInsights } from "./telemetry";

const defaultState: IApplicationState = initialState; // setting language first in initialState
const store = createReduxStore(defaultState, true);

setUpAppInsights();

registerMixins();
registerProviders();

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>
    , document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();

