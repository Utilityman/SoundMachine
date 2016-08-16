'use strict';

const electron = require('electron');
const {ipcMain} = require('electron');

const {app} = electron;
const {BrowserWindow} = electron;

var mainWindow = null;
var ready = false;
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
        height: 300,
        width: 300,
        resizable: false,
        show: true,
        frame: false,
    });

    loadWindow.loadURL('file://' + __dirname + '/app/load.html');
    mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    //mainWindow.webContents.openDevTools();mainWindow.show();
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
    var ready = true;

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
    if (mainWindow === null && ready)
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
    if(arg == '')
        if(!visibility)
            mainWindow.show();
        else {
            mainWindow.hide();
        }
    else if(arg == 'finished-loading')
    {
        mainWindow.show();
        loadWindow.hide();
        loadWindow = null;
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

ipcMain.on('quit', (event, arg) =>
{
    app.quit();
});
