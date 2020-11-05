var RESOLUTION = 'RESOLUTION';
var tabs = {};
var tabId;

chrome.downloads.setShelfEnabled(false);

chrome.tabs.onActivated.addListener(function (activeInfo) {
    this.tabId = activeInfo.tabId;
    if (tab()) {
        enablePopup();
    } else {
        disablePopup();
    }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.msgId == 'showPopup') {
        sendResponse({ contentData: tab().contentData, resolutions: tab().resolutions });
    } else if (message.msgId == 'clickDownload') {
        tab().buttonId = message.buttonId;
        var m3u8Url = tab().m3u8Urls[tab().buttonId];
        fetch(m3u8Url).then(r => r.text()).then(r => {
            tab().tsUrls = r.split('\n').filter(s => !s.startsWith('#'));
            tab().httpUrl = m3u8Url.substr(0, m3u8Url.lastIndexOf('/') + 1);
            tab().index = 0;
            sendResponse({ buttonId: message.buttonId, parts: tab().tsUrls.length, part: 0 });
            downloadPart(tab().index);
        });
    }
});

chrome.webRequest.onBeforeRequest.addListener(
    function (response) {
        if ((!tab() || !tab().init) && !response.url.includes('index')) {
            if (!tab()) {
                initTab();
            }
            tab().init = true;
            fetch(response.url).then(r => r.text()).then(r => {
                tab().resolutions = r.split('\n').slice(1).filter(s => s.startsWith('#')).map(s => s.substr(s.indexOf(RESOLUTION) + RESOLUTION.length + 1));
                tab().m3u8Urls = r.split('\n').filter(s => !s.startsWith('#'));
                enablePopup();
            });
        }
        return response;
    },
    { urls: ["*://bl.uma.media/*.m3u8*"] },
    ["requestBody"]
);

chrome.downloads.onChanged.addListener(function ({ id, state }) {
    if (id == tab().downloadId && state && state.current == 'complete') {
        console.log('complete ' + tab().tsUrls[tab().index]);
        chrome.runtime.sendMessage({ msgId: 'completePart', parts: tab().tsUrls.length, part: tab().index + 1});
        eraseDownload(tab().index);
        downloadPart(++tab().index);
    }
});

function enablePopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { msgId: "enablePopup" }, function (contentData) {
            tab().contentData = contentData;
            chrome.browserAction.enable();
        });
    });
}

function disablePopup() {
    chrome.browserAction.disable();
}

function downloadPart(i) {
    if (i == tab().tsUrls.length - 1) {
        console.log('COMPLETE!!!');
    } else {
        console.log('downloading ' + tab().tsUrls[i]);
        var url = getUrl(i);
        var filename = `${clearName(tab().contentData.name)}/${clearName(tab().contentData.season)}/${clearName(tab().contentData.episode)}/${tab().resolutions[tab().buttonId]}/${tab().tsUrls[i]}`;
        chrome.downloads.download({ url: url, filename: filename }, function (id) {
            tab().downloadId = id;
        });
    }
}

function tab() {
    return this.tabs[this.tabId];
}

function initTab() {
    this.tabs[this.tabId] = {};
}

function clearName(s) {
    return s.replaceAll(/[\/:*?"><|]/g, '');
}

function eraseDownload(i) {
    chrome.downloads.erase({ query: [tab().tsUrls[i]] }, function (eraseIds) {
        console.log(JSON.stringify(eraseIds));
    });
}

function getUrl(i) {
    return tab().httpUrl + tab().tsUrls[i];
}
