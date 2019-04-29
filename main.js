// Modules to control application life and create native browser window
const path = require('path')
const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const electron = require('electron')
const Store = require('electron-store')
const uuid = require('uuid/v1')
const store = new Store()
const {app, BrowserWindow, ipcMain} = electron

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let developerWindow

function createWindow () {
    // Create the browser window.
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize

    mainWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width: width / 2,
        height: height,
        webPreferences: {
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('new-site', (event, url, scriptContent) => {
    if (developerWindow) {
        return
    }
    
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize
    
    developerWindow = new BrowserWindow({
        kind: 'dev',
        scriptContent: scriptContent,
        downloadDestination: '',
        saveCounter: 0,
        x: width / 2,
        y: 0,
        width: width / 2,
        height: height,
        parent: mainWindow,
        webPreferences: {
            /*
            nodeIntegration is disabled, JavaScript is unable to leverage Node.js primitives and modules.
            Note: sandbox:true should disable this by default, but we do it anyways.
            */
            nodeIntegration: false,
      
            /*
            A sandboxed renderer does not have a Node.js environment running (with the  exception  of  preload  scripts)  
            and  the  renderers  can  only  make  changes  to  the system by delegating tasks to the main process via IPC. 
            */
            sandbox: true,
      
            /*
            contextIsolation introduces JavaScript context isolation for preload scripts, as implemented  in 
            Chrome Content Scripts.  This option should be used when loading potentially untrusted resources  
            to ensure that the  loaded content cannot tamper with the preload script and any Electron  
            APIs being used. The preload script will still have access to global variables, but it  
            will use its own set of JavaScript   builtins (Array, Object, JSON, etc.) and will be isolated 
            from any changes  made to the global environment by the loaded page. 
            */
            contextIsolation: true,
      
            /*
            The preload script binds a specific function to the window. The function has the ability to
            execute IPC messages without giving untrusted content complete access to ipcRenderer.
            */
            preload: path.join(__dirname, 'preload-sandboxed.js')
        }
    })
    .on('close', function () {
        developerWindow = null
    })
    
    developerWindow.loadURL(url)
    developerWindow.webContents.openDevTools()
});

ipcMain.on('get-script-content', function(event, rpc, arg) {
    let scriptContent = `
    function saveImageUrl(imageUrl, filename) {
        window.postMessage({ kind: "save_image", imageUrl, filename})
    }
    
    function parseURL(url) {
        var parser = document.createElement('a'),
            searchObject = {},
            queries, split, i;
        // Let the browser do the work
        parser.href = url;
        // Convert query string to object
        queries = parser.search.replace(/^\\?/, '').split('&');
        for( i = 0; i < queries.length; i++ ) {
            split = queries[i].split('=');
            searchObject[split[0]] = split[1];
        }
        return {
            protocol: parser.protocol,
            host: parser.host,
            hostname: parser.hostname,
            port: parser.port,
            pathname: parser.pathname,
            search: parser.search,
            searchObject: searchObject,
            hash: parser.hash
        };
    }
    
    ${event.sender.browserWindowOptions.scriptContent}
    `
    
    event.returnValue = scriptContent;
});

ipcMain.on('save-image-url', function(event, url, filename) {
    console.log(`save url ${url}`)

    let downloadPath = '.';
    if (event.sender.browserWindowOptions.kind == 'dev') {
        // TODO: configurable default
        downloadPath = `/Users/connor/Work/usuarium/folio-crawler/test_downloads`
    }
    else {
        downloadPath = event.sender.browserWindowOptions.downloadDestination
    }
    
    let basename = filename !== undefined ? filename : `${event.sender.browserWindowOptions.saveCounter++}.jpg`
    let fullFilename = `${downloadPath}/${basename}`
    let wstream = fs.createWriteStream(fullFilename);

    if (url.indexOf('https:') === 0) {
        request = https.get(url, function(response) {
            response.pipe(wstream);
            response.on('end', () => {
                wstream.end()
            });
        });
    }
    else if (url.indexOf('http:') === 0) {
        request = http.get(url, function(response) {
            response.pipe(wstream);
            response.on('end', () => {
                wstream.end()
            });
        });
    }
})

ipcMain.on('save-preset', function (event, scriptContent, presetName, hostname) {
    let presets = store.get('presets', [])
    let id = uuid()
    presets.push({id, hostname, presetName, scriptContent})
    store.set('presets', presets)
    
    ipcMain.send('presets_did_change')
})

ipcMain.on('get_presets', function (event) {
    event.returnValue = store.get('presets', [])
})
