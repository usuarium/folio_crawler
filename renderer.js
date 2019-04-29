// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {ipcRenderer, remote} = require('electron')
const dialog = remote.dialog
const url = require('url')
const currentWindow = remote.getCurrentWindow()

ipcRenderer.send('presets_did_change', presetsDidChange)

function presetsDidChange() {
    updatePresets()
}

let scriptPresets = []

function updatePresets() {
    scriptPresets = ipcRenderer.sendSync('get_presets')
    
    removeAllPresets()
    
    scriptPresets.forEach((preset) => {
        let option = document.createElement('option')
        option.innerHTML = `${preset.presetName} (${preset.hostname})`
        option.value = preset.id
        
        savedScriptsList.append(option)
    })
}
function removeAllPresets() {
    savedScriptsList.childNodes.forEach((node) => {
        savedScriptsList.removeChild(node)
    })
}

function newSiteButtonDidClick()
{
    let url = newSiteUrlField.value
    let scriptContent = scriptContentField.value
    ipcRenderer.send('new-site', url, scriptContent)
}
function savedSiteButtonDidClick()
{
    let url = document.getElementById('site_url').value
    let preset = document.getElementById('saved_scripts').value
    ipcRenderer.send('saved-site', url, preset)
}

function updateScriptButtonDidClick()
{
}

function saveScriptButtonDidClick()
{
    let scriptContent = scriptContentField.value
    let presetName = presetNameField.value
    let hostname = hostnameLabel.innerHTML
    
    if (scriptContent.length === 0) {
        let options = {
            message: 'Error',
            detail: 'The script field is empty'
        }
        dialog.showMessageBox(currentWindow, options, () => {})
        return
    }
    if (presetName.length === 0) {
        let options = {
            message: 'Error',
            detail: 'The preset name field is empty'
        }
        dialog.showMessageBox(currentWindow, options, () => {})
        return
    }
    if (hostname.length === 0) {
        let options = {
            message: 'Error',
            detail: 'The hostname field is empty (because of site url)'
        }
        dialog.showMessageBox(currentWindow, options, () => {})
        return
    }
    
    ipcRenderer.send('save-preset', scriptContent, presetName, hostname)
}

function updatePresetName(newValue, updateIfEmpty) {
    if (updateIfEmpty === true && presetNameField.value.length > 0) {
        return
    }
    
    presetNameField.value = newValue
    hostnameLabel.innerHTML = newValue
}

const newSiteUrlField = document.getElementById('new_site_url')
const scriptContentField = document.getElementById('script_content')
const presetNameField = document.getElementById('preset_name')
const hostnameLabel = document.getElementById('hostname')
const savedScriptsList = document.getElementById('saved_scripts')
document.getElementById('start_new_site').addEventListener('click', newSiteButtonDidClick)
document.getElementById('start_saved_site').addEventListener('click', savedSiteButtonDidClick)
document.getElementById('update_script_site').addEventListener('click', updateScriptButtonDidClick)
document.getElementById('save_script').addEventListener('click', saveScriptButtonDidClick)
document.getElementById('new_site_url').addEventListener('blur', function () {
    let siteUrl = this.value
    if (siteUrl === null || siteUrl.length === 0) {
        return
    }
    
    let urlParts = url.parse(siteUrl)
    
    updatePresetName(urlParts.host, true)
})

updatePresets()