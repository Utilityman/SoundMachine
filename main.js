'use strict';

const electron = require('electron');
const {ipcMain} = require('electron');

const {app} = electron;
const {BrowserWindow} = electron;

var mainWindow = null;
var loadWindow = null;
var selfDestructed = false;

function createWindow()
{
    mainWindow = new BrowserWindow(
    {
        backgroundColor: '#404040',
        frame: false,
//        titleBarStyle: 'hidden',
        height: 600,
        width: 808,
        minHeight: 28,
        minWidth: 500,
        show: false,
    });
    loadWindow = new BrowserWindow(
    {
        backgroundColor: '#404040',
        height: 316,
        width: 300,
        resizeable: false,
        show: true,
    });

    loadWindow.loadURL('file://' + __dirname + '/app/load.html');
    mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    //mainWindow.webContents.openDevTools();
    loadWindow.on('closed', () =>
    {
        loadWindow = null;
        if(!selfDestructed)
        {
            app.quit();
        }
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin')
    {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null)
    {
        createWindow();
    }
});

ipcMain.on('toggleTop', (event, arg) => {
    mainWindow.setAlwaysOnTop(
        !mainWindow.isAlwaysOnTop());
})

ipcMain.on('toggleTools', (event, arg) =>
{
    mainWindow.toggleDevTools();
});

ipcMain.on('toggleWindow', (event, arg) =>
{
    var visibility = mainWindow.isVisible();

    if(!visibility)
        mainWindow.show();
    else {
        mainWindow.hide();
    }
});

ipcMain.on('loading', (event, arg) =>
{
    if(loadWindow != null)
        loadWindow.webContents.send('progress', {'prog': arg});
});

ipcMain.on('self-destruct', (event, arg) =>
{
    if(arg == 'loadingWindow')
    {
        selfDestructed = true;
        loadWindow.destroy();
    }
});
