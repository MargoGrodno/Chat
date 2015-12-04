var ip = 'http://192.168.0.102';
var port = '31337';

var uniqueId = function() {
    var date = Date.now();
    var random = Math.random() * Math.random();

    return Math.floor(date * random).toString();
};

var theMessage = function(text) {
    var date = new Date();
    return {
        date: date.getTime(),
        text: text,
        user: appState.user
    };
};

var generalId = uniqueId();

var appState = {
    user: 'Guest_'+generalId,
    id: generalId,
    mainUrl: ip + ':' + port,
    history: [],
    token: 0
};

function run() {

    $("#username").text(appState.user);

    var changeServerPopup = document.getElementById('changeServer');
    var takeUsernamePopup = document.getElementById('takeUsername');
    var modalOverlayMask = document.getElementById('modalOverlayMask');

    $("#settingsButton").on("click", function() {
        show([changeServerPopup, modalOverlayMask]);
    });

    $("#cancelIpButton").on("click", function() {
        hide([changeServerPopup, modalOverlayMask]);
    });

    $("#cancelNameButton").on("click", function() {
        hide([takeUsernamePopup, modalOverlayMask]);
    });

    $("#newMessageField").keypress(function(e) {
        if (e.which == 13) {
            onSendButtonClick();
        }
    });

    $("#sendButton").on('click', onSendButtonClick);

    $("#changeNameButton").on("click", onChangeNameButtonClick);

    doPolling();
}

function hide(args) {
    for (var i = args.length - 1; i >= 0; i--) {
        args[i].style.display = "none";
    };
}

function show(args) {
    for (var i = args.length - 1; i >= 0; i--) {
        args[i].style.display = "block";
    };
}

function scrollHistoryBottom() {
    var historyConteiner = document.getElementById('historyConteiner');
    historyConteiner.scrollTop = historyConteiner.scrollHeight;
}

function onSendButtonClick() {

    var newMessageBox = document.getElementById('newMessageField');
    var newMessage = theMessage(newMessageBox.value);
    if (newMessageBox.value == '')
        return;

    newMessageBox.value = '';
    sendMessage(newMessage, function() {
        console.log('Message sent ' + newMessage.text);
    });
}

function onChangeNameButtonClick () {

    var nameField = document.getElementById('nameField');
    var newName = nameField.value;
    
    if (nameField.value == ''){
        var emptyNameMessage = document.getElementById("emptyNameMessage");
        emptyNameMessage.style.display = "block";
        return;
    }
        

    appState.user = newName;
    $("#username").text(appState.user);

    var takeUsernamePopup = document.getElementById('takeUsername');
    var modalOverlayMask = document.getElementById('modalOverlayMask');
    hide([takeUsernamePopup, modalOverlayMask]);

}

function sendMessage(message, continueWith) {
    post(appState.mainUrl, JSON.stringify(message), function() {
        continueWith && continueWith();
    });
}

function updateHistory(newMessages) {
    for (var i = 0; i < newMessages.length; i++)
        addMessageInternal(newMessages[i]);
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    return date.getHours() + ':' + date.getMinutes();
}

function addMessageInternal(message) {
    var history = appState.history;
    history.push(message);

    var historyBox = document.getElementById('history');

    var tmpl = _.template(document.getElementById('list-template').innerHTML);

    var resultMessageDiv = tmpl({
        time: getHourMinutes(message.date),
        name: message.user,
        text: message.text
    });

    var tmpMessageDiv = document.createElement("div");
    tmpMessageDiv.innerHTML = resultMessageDiv;
    resultDiv = tmpMessageDiv.firstElementChild;
    historyBox.appendChild(resultDiv);
}

function doPolling() {
    function loop() {
        var url = appState.mainUrl + '?token=' + appState.token;

        get(url, function(responseText) {
            $("#offline").hide("slow");
            var response = JSON.parse(responseText);
            console.log(response);
            appState.token = response.token;
            updateHistory(response.messages);
            scrollHistoryBottom();
            setTimeout(loop, 1000);
        }, function(error) {
            console.log(error);
            defaultErrorHandler(error);
            setTimeout(loop, 1000);
        });
    }

    loop();
}

function defaultErrorHandler(message) {
    var offlineBox = document.getElementById('offline');
    offlineBox.innerText = 'ERROR:\n' + message + '\n';
    $("#offline").show("slow");
    console.error(message);
}

function get(url, continueWith, continueWithError) {
    ajax('GET', url, null, continueWith, continueWithError);
}

function post(url, data, continueWith, continueWithError) {
    console.log("post: "+data);
    ajax('POST', url, data, continueWith, continueWithError);
}

function isError(text) {
    if (text == "")
        return false;

    try {
        var obj = JSON.parse(text);
    } catch (ex) {
        return true;
    }

    return !!obj.error;
}

function ajax(method, url, data, continueWith, continueWithError) {
    var xhr = new XMLHttpRequest();

    continueWithError = continueWithError || defaultErrorHandler;
    xhr.open(method || 'GET', url, true);

    xhr.onload = function() {
        if (xhr.readyState !== 4)
            return;

        if (xhr.status != 200) {
            continueWithError('Error on the server side, response ' + xhr.status);
            return;
        }

        if (isError(xhr.responseText)) {
            continueWithError('Error on the server side, response ' + xhr.responseText);
            return;
        }

        continueWith(xhr.responseText);
    };

    xhr.ontimeout = function() {
        сontinueWithError('Server timed out !');
    }

    xhr.onerror = function(e) {
        var errMsg = 'Server connection error ' + appState.mainUrl + '\n' +
            '\n' +
            'Check if \n' +
            '- server is active\n' +
            '- server sends header "Access-Control-Allow-Origin:*"';

        continueWithError(errMsg);
    };

    xhr.send(data);
}

window.onerror = function(err) {
    defaultErrorHandler(err.toString());
}
