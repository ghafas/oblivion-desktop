/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, ipcMain, screen, shell, Menu, Tray } from 'electron';
import settings from 'electron-settings';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import './ipc';
import { isDev, removeFileIfExists } from './lib/utils';
import { openDevToolsByDefault, useCustomWindowXY } from './dxConfig';
import { disableProxy } from './lib/proxy';

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

(async () => {
    await removeFileIfExists('log.txt');
})();

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug && openDevToolsByDefault) {
    require('electron-debug')();
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS'];

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload,
        )
        .catch(console.log);
};

const createWindow = async () => {
    if (isDebug) {
        await installExtensions();
    }

    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths);
    };

    const windowWidth = 400;
    const windowHeight = 650;

    const config: any = {
        show: false,
        width: windowWidth,
        height: windowHeight,
        enableRemoteModule: true,
        autoHideMenuBar: true,
        transparent: false,
        center: true,
        frame: true,
        resizable: false,
        fullscreenable: false,
        icon: getAssetPath('oblivion.png'),
        webPreferences: {
            devTools: false,
            devToolsKeyCombination: false,
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
    };

    if (isDev()) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const displayWidth = primaryDisplay.workAreaSize.width;
        const displayHeight = primaryDisplay.workAreaSize.height;
        if (useCustomWindowXY) {
            config.x = displayWidth - windowWidth - 60;
            config.y = displayHeight - windowHeight - 160;
        }
        config.webPreferences.devTools = true;
        config.webPreferences.devToolsKeyCombination = true;
    }

    function createMainWindow() {
        mainWindow = new BrowserWindow(config);

        mainWindow.loadURL(resolveHtmlPath('index.html'));

        mainWindow.on('ready-to-show', async () => {
            if (!mainWindow) {
                throw new Error('"mainWindow" is not defined');
            }
            // await settings.get('systemTray')
            if (process.env.START_MINIMIZED) {
                mainWindow.minimize();
            } else {
                mainWindow.show();
            }
        });

        ipcMain.on('open-devtools', async () => {
            // TODO add toggle
            mainWindow?.webContents.openDevTools();
            // mainWindow.webContents.closeDevTools();
        });

        mainWindow.on('closed', () => {
            disableProxy();
            mainWindow = null;
        });

        mainWindow.on('minimize', async (e: any) => {
            e.preventDefault();
            if (await settings.get('systemTray')) {
                mainWindow?.hide();
            }
        });

        const menuBuilder = new MenuBuilder(mainWindow);
        menuBuilder.buildMenu();

        // Open urls in the user's browser
        mainWindow.webContents.setWindowOpenHandler((edata) => {
            shell.openExternal(edata.url);
            return { action: 'deny' };
        });
    }

    createMainWindow();

    let appIcon = null;
    app?.whenReady().then(() => {
        appIcon = new Tray(getAssetPath('oblivion.png'));
        appIcon.on('click', () => {
            if (!mainWindow) {
                createMainWindow();
            } else {
                mainWindow.show();
            }
        });
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Oblivion Desktop',
                type: 'normal',
                click: () => {
                    if (!mainWindow) {
                        createMainWindow();
                    } else {
                        mainWindow.show();
                    }
                },
            },
            // TODO
            /*{ label: '', type: 'separator' },
            {
                label: 'حالت پروکسی',
                submenu: [
                    { label: 'متصل است', type: 'radio' },
                    { label: 'عدم اتصال', type: 'radio' },
                ],
            },*/
            { label: '', type: 'separator' },
            {
                label: 'خروج',
                type: 'normal',
                click: () => {
                    app.quit();
                },
            },
            /*{ label: 'خروج', role: 'close' },*/
        ]);
        contextMenu.items[1].checked = false;
        appIcon.setToolTip('Oblivion Desktop');
        appIcon.setContextMenu(contextMenu);
    });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('will-quit', () => {
    disableProxy();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.whenReady()
    .then(() => {
        createWindow();
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow === null) createWindow();
        });
    })
    .catch(console.log);
