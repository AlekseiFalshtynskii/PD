chrome.runtime.sendMessage({ msgId: 'showPopup' }, function (response) {
    var contentData = response.contentData;
    var resolutions = response.resolutions;

    var divTitle = document.getElementById('title');
    divTitle.innerHTML = `${contentData.name}. ${contentData.season}. ${contentData.episode}`;
    var divButtons = document.getElementById('buttons');

    resolutions.forEach((resolution, index) => {
        divButtons.innerHTML += `<div id='div${index}'></div><button id='${index}'>Download '${resolution}'</button></div>`;
    });

    Array.from(document.getElementsByTagName('button')).forEach(btn => {
        btn.onclick = function () {
            chrome.runtime.sendMessage({ msgId: 'clickDownload', buttonId: this.id }, function (response) {
                chrome.extension.getBackgroundPage().console.log('clicked button ' + response.buttonId);
                refreshParts(response.buttonId, response.parts, response.part);
            });
        };
    });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.msgId == 'completePart') {
        refreshParts(message.buttonId, message.parts, message.part);
    }
});

function refreshParts(buttonId, parts, part) {
    var div = document.getElementById(`div${buttonId}`);
    div.innerHTML = `${part} / ${parts}`;
}