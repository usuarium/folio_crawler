const {ipcRenderer} = require('electron')

class SandboxTools
{
    injectScript(content) {
        if (!this.scriptTag) {
            this.scriptTag = document.createElement('script');
        }
        let inlineScript = document.createTextNode(content);

        if (this.scriptTag.childNodes.length > 0) {
            this.scriptTag.replaceChild(inlineScript, this.scriptTag.childNodes[0])
        }
        else {
            this.scriptTag.appendChild(inlineScript);
        }
    }

    initScriptContent() {
        let scriptContent = ipcRenderer.sendSync('get-script-content');

        this.injectScript(scriptContent)
    }
}

const sandboxTools = new SandboxTools()

sandboxTools.initScriptContent()
window.addEventListener('message', function (event) {
    if (event.data.kind === 'save_image') {
        if (event.data.imageData !== undefined) {
            ipcRenderer.send('save-image-data', event.data.imageData, event.data.filename);
        }
        else if (event.data.imageUrl !== undefined) {
            ipcRenderer.send('save-image-url', event.data.imageUrl, event.data.filename);
        }
    }
})

window.isolated = true
window.onload = function () {
    window.document.body.appendChild(sandboxTools.scriptTag)
}