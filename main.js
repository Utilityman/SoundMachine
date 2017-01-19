'use strict';

const electron = require('electron');
const {ipcMain} = require('electron');
//let Menu = require('electron');

const {app} = electron;
const {BrowserWindow} = electron;

let mainWindow = null;
let ready = false;
let loadWindow = null;
let selfDestructed = false;

function createWindow()
{
    mainWindow = new BrowserWindow(
    {
        backgroundColor: '#404040',
        frame: false,
//        titleBarStyle: 'hidden',
        height: 600,
        width: 740,
        minHeight: 28,
        minWidth: 500,
        show: false,
        icon: __dirname + '/app/imgs/iconV2.png',
    });
    loadWindow = new BrowserWindow(
    {
        backgroundColor: '#404040',
        height: 300,
        width: 300,
        resizable: false,
        show: true,
        frame: false,
        icon: __dirname + '/app/imgs/iconV2.png',
    });

    loadWindow.loadURL('file://' + __dirname + '/app/load.html');
    mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    // if the main window isn't opening, uncomment this to immediately see mainWindow/devTools
    //mainWindow.webContents.openDevTools();  mainWindow.show();
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

    mainWindow.on('blur', () => {
        mainWindow.webContents.send('unfocus', null);
    });
    let ready = true;

    let template = [{
            label: "Application",
            submenu: [
                { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
                { type: "separator" },
                { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
            ]}, {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
            ]}
        ];
    //Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
    let visibility = mainWindow.isVisible();
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

ipcMain.on('minimize', (event, arg) =>
{
    mainWindow.minimize();
});
