var RESOLUTION = 'RESOLUTION';
var init = false;
var resolutions;
var m3u8Urls;
var tsUrls;
var contentData;
var httpUrl;
var downloadId;
var index;

chrome.downloads.setShelfEnabled(false);

chrome.browserAction.disable();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.msgId == 'showPopup') {
        sendResponse(resolutions);
    } else if (message.msgId == 'clickDownload') {
        sendResponse(message);
        var m3u8Url = m3u8Urls[message.buttonId];
        fetch(m3u8Url).then(r => r.text()).then(r => {
            tsUrls = r.split('\n').filter(s => !s.startsWith('#'));
            httpUrl = m3u8Url.substr(0, m3u8Url.lastIndexOf('/') + 1);
            index = 0;
            downloadPart(index);
        });
    }
});

chrome.webRequest.onBeforeRequest.addListener(
    function (response) {
        if (!init && !response.url.includes('index')) {
            init = true;
            fetch(response.url).then(r => r.text()).then(r => {
                resolutions = r.split('\n').slice(1).filter(s => s.startsWith('#')).map(s => s.substr(s.indexOf(RESOLUTION) + RESOLUTION.length + 1));
                m3u8Urls = r.split('\n').filter(s => !s.startsWith('#'));
                chrome.browserAction.enable();
                
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { msgId: "enablePopup" }, function (response) {
                        contentData = response;
                    });
                });
            });
        }
        return response;
    },
    { urls: ["*://bl.uma.media/*.m3u8*"] },
    ["requestBody"]
);

chrome.downloads.onChanged.addListener(function ({ id, state }) {
    if (id == downloadId && state && state.current == 'complete') {
        console.log('complete ' + tsUrls[index]);
        eraseDownload(index);
        downloadPart(++index);
    }
});

function downloadPart(i) {
    if (i == tsUrls.length - 1) {
        console.log('COMPLETE!!!');
    } else {
        console.log('downloading ' + tsUrls[i]);
        var url = getUrl(i);
        var filename = `${clearName(contentData.name)}/${clearName(contentData.season)}/${clearName(contentData.episode)}/${tsUrls[i]}`;
        chrome.downloads.download({ url: url, filename: filename }, function (id) {
            downloadId = id;
        });
    }
}

function clearName(s) {
    return s.replaceAll(/[\/:*?"><|]/g, '');
}

function eraseDownload(i) {
    chrome.downloads.erase({ query: [tsUrls[i]] }, function (eraseIds) {
        console.log(JSON.stringify(eraseIds));
    });
}

function getUrl(i) {
    return httpUrl + tsUrls[i];
}
