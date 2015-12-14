var ip = '192.168.0.102';
var port = '31337';

var uniqueId = function() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

var appState = {
    userName: 'Guest_' + uniqueId(),
    userId: uniqueId(),
    mainUrl: ip + ':' + port,
    token: 0,
    curentReq: null
};

function run() {
    addEventListerers();
    doPolling();
}

function doPolling() {
    function loop() {
        var url = 'http://' + appState.mainUrl + '?token=' + appState.token;

        get(url, function(responseText) {
            var response = JSON.parse(responseText);
            $("#offline").hide("slow");
            appState.token = response.token;
            updateHistory(response.messages);
            setTimeout(loop, 1000);
            return;

            defaultErrorHandler("unhandle response");
        }, function(error) {
            console.log(error);
            defaultErrorHandler(error);
            setTimeout(loop, 1000);
        });
    }

    loop();
}

function get(url, continueWith, continueWithError) {
    ajax('GET', url, null, continueWith, continueWithError);
}

function post(url, data, continueWith, continueWithError) {
    ajax('POST', url, data, continueWith, continueWithError);
}

function put(url, data, continueWith, continueWithError) {
    ajax('PUT', url, data, continueWith, continueWithError);
}

function del(url, data, continueWith, continueWithError) {
    ajax('DELETE', url, data, continueWith, continueWithError);
}

function defaultErrorHandler(message) {
    var error = 'ERROR:\n' + message + '\n';
    $("#offline").text(error);
    $("#offline").show(1000);
    console.error(message);
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
    appState.curentReq = xhr;

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
    };

    xhr.onerror = function(e) {
        var errMsg = 'Server connection error http://' + appState.mainUrl + '\n' +
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

function changeServer(newAddress) {
    appState.mainUrl = newAddress;
    appState.token = 0;
    appState.curentReq.abort();

    cleanHistory();
    doPolling();
}

function sendMessage(message, continueWith) {
    post('http://' + appState.mainUrl, JSON.stringify(message), function() {
        continueWith && continueWith();
    });
}

function deleteMessage(messageId, continueWith) {
    del('http://' + appState.mainUrl + '/' + messageId, JSON.stringify({
        id: messageId
    }), function() {
        continueWith && continueWith();
    });
}

function updateHistory(newMessages) {
    for (var i = 0; i < newMessages.length; i++) {
        if (newMessages[i].isDeleted) {
            markMsgAsDeleted(newMessages[i].msgId);
        } else {
            addMessageInternal(newMessages[i]);
        }
    }
}

function addMessageInternal(message) {
    var tmplMessage = _.template(document.getElementById('list-template').innerHTML);

    var resultMessageDiv = tmplMessage({
        time: getHourMinutes(message.date),
        name: message.userName,
        text: message.text,
        id: message.msgId
    });

    $("#history").append(resultMessageDiv);

    scrollHistoryBottom();
    addBtnsForMsg(message);
}

function addBtnsForMsg(message) {
    if (message.userId == appState.userId) {
        $("#" + message.msgId + " > .k3 > .editBtn").css("display", "block");
        $("#" + message.msgId + " > .k3 > .deleteBtn").css("display", "block");
        $("#" + message.msgId + " > .k3 > .deleteBtn").on("click", function() {
            deleteMessage(message.msgId, function() {
                console.log('Message deleted ' + message.msgId);
            });
        });
    } else {
        $("#" + message.msgId + " > .k3 > .citeBtn").css("display", "block");
    }
}

function markMsgAsDeleted(messageId) {
    $("#" + messageId + " > .k2 > .text").text("(*deleted*)");
    $("#" + messageId + " > .k1 > .deleteMarker").css("visibility", "visible");
    $("#" + messageId + " > .k3 > .editBtn").css("display", "none");
    $("#" + messageId + " > .k3 > .deleteBtn").css("display", "none");
    $("#" + messageId + " > .k3 > .citeBtn").css("display", "none");
}

function addEventListerers() {
    onEnterPressed($("#newMessageField"), onSendButtonClick);
    $("#sendButton").on('click', onSendButtonClick);

    $("#settingsButton").on("click", openChangeServerPopup);
    onEnterPressed($("#serverAddressField"), onChangeServerButtonClick)
    $("#changeServerButton").on("click", onChangeServerButtonClick);
    $("#cancelChangeServerButton").on("click", closeChangeServerPopup);

    onEnterPressed($("#nameField"), onChangeNameButtonClick);
    $("#changeNameButton").on("click", onChangeNameButtonClick);
    $("#cancelNameButton").on("click", onCloseNamePopupClick);

}

function openChangeServerPopup() {
    $('#curentServer').text(appState.mainUrl);
    $("#changeServer").show();
    $("#modalOverlayMask").show();
    $('#serverAddressField').val(appState.mainUrl);
    $('#serverAddressField').focus();
}

function closeChangeServerPopup() {
    $("#changeServerErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#changeServer").hide();
    $('#newMessageField').focus();
}

function closeNamePopup() {
    $("#nameErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#takeUsername").hide();
    $('#newMessageField').focus();
}

function onCloseNamePopupClick() {
    $("#username").text(appState.userName);
    closeNamePopup();
}

function onEnterPressed(field, action) {
    field.keypress(function(e) {
        if (e.which == 13) {
            action();
        }
    });
}

function cleanHistory() {
    $("#history").empty();
}

function scrollHistoryBottom() {
    historyConteiner = $("#history");
    historyConteiner.scrollTop(historyConteiner.get(0).scrollHeight);
}

var theMessage = function(text) {
    var date = new Date();
    return {
        userId: appState.userId,
        userName: appState.userName,
        date: date.getTime(),
        text: text
    };
};

function onSendButtonClick() {
    var msgText = $("#newMessageField").val();
    if (msgText == '')
        return;
    $("#newMessageField").val("");
    var newMessage = theMessage(msgText);
    sendMessage(newMessage, function() {
        console.log('Message sent ' + newMessage.text);
    });
}

function onChangeNameButtonClick() {
    var newName = $("#nameField").val();
    if (newName == '') {
        $("#nameErrorMessage").text("You can't save empty name!");
        $("#nameErrorMessage").show();
        return;
    }
    changeName(newName);
    closeNamePopup();
}

function changeName(name) {
    appState.userName = name;
    $("#username").text(appState.userName);
}

function onChangeServerButtonClick() {
    var newAddress = $("#serverAddressField").val();
    console.log(newAddress);

    if (newAddress == '') {
        $("#changeServerErrorMessage").text("You can't save empty address!");
        $("#changeServerErrorMessage").show();
        return;
    }
    changeServer(newAddress);
    closeChangeServerPopup();
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}
