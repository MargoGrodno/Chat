var ip = '192.168.0.102';
var port = '31337';

var uniqueId = function() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

var isExpectRes = false;
var generalId = uniqueId();

var appState = {
    user: 'Guest_' + generalId,
    id: generalId,
    mainUrl: ip + ':' + port,
    token: 0
};

function run() {
    $("#username").text(appState.user);
    addEventListerers();

    doPolling();
}

function doPolling() {
    function loop() {
        var url = 'http://' + appState.mainUrl + '?token=' + appState.token;

        var requestUrl = appState.mainUrl;
        isExpectRes = true;

        get(url, function(responseText) {
            if (isExpectRes && (appState.mainUrl == requestUrl)) {
                $("#offline").hide("slow");
                var response = JSON.parse(responseText);
                appState.token = response.token;
                updateHistory(response.messages);
                setTimeout(loop, 1000);
                isExpectRes = false;
            }
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
    console.log("post: " + data);
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

function addEventListerers() {
    $("#settingsButton").on("click", function() {
        $('#curentServer').text(appState.mainUrl);
        $("#changeServer").show();
        $("#modalOverlayMask").show();
        $('#serverAddressField').val(appState.mainUrl);
        $('#serverAddressField').focus();
    });

    $("#cancelChangeServerButton").on("click", closeChangeServerPopup);

    $("#cancelNameButton").on("click", closeNamePopup);

    onEnterPressed($("#newMessageField"), onSendButtonClick);

    onEnterPressed($("#nameField"), onChangeNameButtonClick);

    onEnterPressed($("#serverAddressField"), onChangeServerButtonClick)

    $("#sendButton").on('click', onSendButtonClick);

    $("#changeNameButton").on("click", onChangeNameButtonClick);

    $("#changeServerButton").on("click", onChangeServerButtonClick);
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

function defaultErrorHandler(message) {
    var error = 'ERROR:\n' + message + '\n';
    $("#offline").text(error);
    $("#offline").show(1000);
    console.error(message);
}

function onEnterPressed(field, action) {
    field.keypress(function(e) {
        if (e.which == 13) {
            action();
        }
    });
}

function scrollHistoryBottom() {
    historyConteiner = $("#history");
    historyConteiner.scrollTop(historyConteiner.get(0).scrollHeight);
}

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
    appState.user = name;
    $("#username").text(appState.user);
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

function changeServer(newAddress) {
    appState.mainUrl = newAddress;
    appState.token = 0;
    cleanHistory();
    doPolling();
}

function cleanHistory() {
    $("#history").empty();
}

function sendMessage(message, continueWith) {
    post('http://' + appState.mainUrl, JSON.stringify(message), function() {
        continueWith && continueWith();
    });
}

var theMessage = function(text) {
    var date = new Date();
    return {
        id: appState.id,
        user: appState.user,
        date: date.getTime(),
        text: text
    };
};

function updateHistory(newMessages) {
    for (var i = 0; i < newMessages.length; i++)
        addMessageInternal(newMessages[i]);
}

function addMessageInternal(message) {
    var tmplMessage = _.template(document.getElementById('list-template').innerHTML);
    var resultMessageDiv = tmplMessage({
        time: getHourMinutes(message.date),
        name: message.user,
        text: message.text
    });

    $("#history").append(resultMessageDiv);
    scrollHistoryBottom();
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}
