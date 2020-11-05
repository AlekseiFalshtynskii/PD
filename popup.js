chrome.runtime.sendMessage({ msgId: 'showPopup' }, function (resolutions) {
    var body = document.getElementsByTagName('body')[0];

    resolutions.forEach((resolution, index) => {
        body.innerHTML += '<button id="' + index + '">Download ' + resolution + '</button>';
    });

    Array.from(document.getElementsByTagName('button')).forEach(btn => {
        btn.onclick = function () {
            chrome.runtime.sendMessage({ msgId: 'clickDownload', buttonId: this.id }, function (response) {
                chrome.extension.getBackgroundPage().console.log('clicked button ' + response.buttonId);
                document.getElementById(response.buttonId).innerHTML = '<span>Downloading</span>'
            });
        };
    });
});
