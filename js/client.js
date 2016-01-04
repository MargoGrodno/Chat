var ip = '192.168.0.101';
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
    abortFn: null
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
    appState.abortFn = ajax('GET', url, null, continueWith, continueWithError);
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

    continueWithError = continueWithError || defaultErrorHandler;
    xhr.open(method || 'GET', url, true);

    xhr.onload = function() {
        if (xhr.readyState !== 4)
            return;

        if (xhr.status != 200) {
            continueWithError('Error on the server side, response ' + xhr.status + ", " + xhr.responseText);
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

    function abortFn() {
        xhr.abort();
    }
    return abortFn;
}

window.onerror = function(err) {
    defaultErrorHandler(err.toString());
}

function changeServer(newAddress) {
    appState.mainUrl = newAddress;
    appState.token = 0;
    appState.abortFn();
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
        id: messageId,
        method: "delete"
    }), function() {
        continueWith && continueWith();
    });
}

function rollbackMessage(messageId, continueWith) {
    del('http://' + appState.mainUrl + '/' + messageId, JSON.stringify({
        id: messageId,
        method: "rollback"
    }), function() {
        continueWith && continueWith();
    });
}

function updateHistory(newMessages) {
    for (var i = 0; i < newMessages.length; i++) {
        if (newMessages[i].action == "add") {
            addMessageInternal(newMessages[i]);
        }
        if (newMessages[i].action == "edit") {
            editMessageInternal(newMessages[i]);
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

    makeEventsForBtns(message);
    makeCorrectMsgView(message);
    scrollHistoryBottom();
}

function editMessageInternal(message) {
    if (!message.isExist) {
        $("#" + message.msgId).remove();
        return;
    };

    makeCorrectMsgView(message);
    scrollHistoryBottom();
}

function makeEventsForBtns(message) {
    if (message.userId == appState.userId) {
        $("#" + message.msgId + " > .k3 > .deleteBtn").on("click", function() {
            deleteMessage(message.msgId, function() {
                console.log('Message deleted ' + message.msgId);
            });
        });

        $("#" + message.msgId + " > .k3 > .rollbackBtn").on("click", function() {
            rollbackMessage(message.msgId, function() {
                console.log('Message rollback ' + message.msgId);
            });
        });
    }
};


function makeCorrectMsgView(message) {
    var messageId = message.msgId;
    console.log(message.msgId + ", "+message.userId + ", " + message.text + ", " + message.isDeleted + ", " + message.isEdit + ", " + message.isExist + "!!!");

    $("#" + messageId + " > .k2 > .text").text(message.text);

    if (message.isDeleted) {
        $("#" + messageId + " > .k2 > .text").text("(*deleted*)");
        $("#" + messageId + " > .k1 > .deleteMarker").css("display", "block");
    }
    if (!message.isDeleted) {
        $("#" + messageId + " > .k1 > .deleteMarker").css("display", "none");
    }
    if (message.isEdit) {
        $("#" + messageId + " > .k1 > .editMarker").css("display", "block");
    }
    if (!message.isEdit) {
        $("#" + messageId + " > .k1 > .editMarker").css("display", "none");
    }

    if (message.userId == appState.userId) {
        $("#" + message.msgId + " > .k3 > .rollbackBtn").css("display", "block");
        if (message.isDeleted) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "none");
            $("#" + messageId + " > .k3 > .deleteBtn").css("display", "none");
        }
        if (!message.isDeleted) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "block");
            $("#" + messageId + " > .k3 > .deleteBtn").css("display", "block");
        }
    }
    if (message.userId != appState.userId) {
        if (message.isDeleted) {
            $("#" + messageId + " > .k3 > .citeBtn").css("display", "none");
        }
        if (!message.isDeleted) {
            $("#" + messageId + " > .k3 > .citeBtn").css("display", "block");
        }
    }
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
