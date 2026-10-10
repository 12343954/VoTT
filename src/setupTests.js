import { configure } from 'enzyme';
import 'jest-enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });
// Silence console.log and console.group statements in testing
console.log = console.group = function() {};
const electronMock = {
    ipcRenderer: {
        send: jest.fn(),
        on: jest.fn(),
        setMaxListeners: jest.fn(),
    },
    app: {
        getAppPath: jest.fn(),
    },
    process: {
        platform: "win32",
    },
    currentWindow: {
        on: jest.fn(),
        isMaximized: jest.fn(),
        isFullScreen: jest.fn(),
        setTitle: jest.fn(),
        minimize: jest.fn(),
        maximize: jest.fn(),
        unmaximize: jest.fn(),
        close: jest.fn(),
    },
    menu: {
        getApplicationMenu: jest.fn(),
    },
};

window.vottElectron = electronMock;
