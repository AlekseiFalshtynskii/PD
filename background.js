var RESOLUTION = 'RESOLUTION';
var tabs = {};
var tabId;
var downloadingQueue = [];

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
        var downloadingInfo = {contentData: tab().contentData, resolution: tab().resolutions[message.buttonId]};
        var m3u8Url = tab().m3u8Urls[message.buttonId];
        fetch(m3u8Url).then(r => r.text()).then(r => {
            downloadingInfo.tsUrls = r.split('\n').filter(s => !s.startsWith('#'));
            downloadingInfo.httpUrl = m3u8Url.substr(0, m3u8Url.lastIndexOf('/') + 1);
            downloadingInfo.index = 0;
            sendResponse({ buttonId: message.buttonId, parts: downloadingInfo.tsUrls.length, part: 0 });
            downloadingQueue.push(downloadingInfo);
            if (downloadingQueue.length == 1) {
                downloadPart(currentDownloadingInfo().index);
            }
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
    if (id == currentDownloadingInfo().downloadId && state && state.current == 'complete') {
        console.log('complete ' + currentDownloadingInfo().tsUrls[currentDownloadingInfo().index]);
        chrome.runtime.sendMessage({ msgId: 'completePart', parts: currentDownloadingInfo().tsUrls.length, part: currentDownloadingInfo().index + 1});
        eraseDownload(currentDownloadingInfo().index);
        downloadPart(++currentDownloadingInfo().index);
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
    if (i == 6) {
        console.log('COMPLETE!!!');
        downloadingQueue.shift();
        if (downloadingQueue.length > 0) {
            downloadPart(currentDownloadingInfo().index);
        }
    } else {
        console.log('downloading ' + currentDownloadingInfo().tsUrls[i]);
        var url = getUrl(i);
        var filename = `${clearName(currentDownloadingInfo().contentData.name)}/${clearName(currentDownloadingInfo().contentData.season)}/${clearName(currentDownloadingInfo().contentData.episode)}/${currentDownloadingInfo().resolution}/${currentDownloadingInfo().tsUrls[i]}`;
        chrome.downloads.download({ url: url, filename: filename }, function (id) {
            currentDownloadingInfo().downloadId = id;
        });
    }
}

function tab() {
    return this.tabs[this.tabId];
}

function initTab() {
    this.tabs[this.tabId] = {};
}

function currentDownloadingInfo() {
    return downloadingQueue[0];
}

function clearName(s) {
    return s.replaceAll(/[\/:*?"><|]/g, '');
}

function eraseDownload(i) {
    chrome.downloads.erase({ query: [getUrl(i)] }, function (eraseIds) {
        console.log(JSON.stringify(eraseIds));
    });
}

function getUrl(i) {
    return currentDownloadingInfo().httpUrl + currentDownloadingInfo().tsUrls[i];
}
