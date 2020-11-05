chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.msgId == 'enablePopup') {
        var ps = document.querySelectorAll('div.player-header__inside')[0].querySelectorAll('p');
        var name = ps[1].innerHTML;
        var episode = ps[0].innerHTML;
        var season = document.querySelectorAll('div.is-active') ? document.querySelectorAll('div.is-active')[0].querySelectorAll('a.is-active')[0].innerHTML.trim() : '1 сезон';
        sendResponse({ name: name, season: season, episode: episode });
    }
});
