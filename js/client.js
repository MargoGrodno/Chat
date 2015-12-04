var ip = 'http://192.168.0.102';
var port = '31337';

var uniqueId = function() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

var generalId = uniqueId();

var appState = {
    user: 'Guest_' + generalId,
    id: generalId,
    mainUrl: ip + ':' + port,
    history: [],
    token: 0
};

function run() {
    $("#username").text(appState.user);
    addEventListerers();

    doPolling();
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

function addEventListerers() {
    $("#settingsButton").on("click", function() {
        $('#ipField').focus();
        show($("#changeServer"), $("#modalOverlayMask"));
    });

    $("#cancelIpButton").on("click", function() {
        $('#newMessageField').focus();
        hide($("#changeServer"), $("#modalOverlayMask"));
    });

    $("#cancelNameButton").on("click", function() {
        $('#newMessageField').focus();
        hide($("#takeUsername"), $("#modalOverlayMask"));
    });

    onEnterPressed($("#newMessageField"), onSendButtonClick);

    onEnterPressed($("#nameField"), onChangeNameButtonClick);

    $("#sendButton").on('click', onSendButtonClick);

    $("#changeNameButton").on("click", onChangeNameButtonClick);
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

function hide() {
    for (var i = arguments.length - 1; i >= 0; i--) {
        arguments[i].css("display", "none");
    };
}

function show() {
    for (var i = arguments.length - 1; i >= 0; i--) {
        arguments[i].css("display", "block");
    };
}

function scrollHistoryBottom() {
    historyConteiner = $("#historyConteiner");
    historyConteiner.scrollTop(historyConteiner.get(0).scrollHeight)
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
        $("#emptyNameMessage").css("display", "block");
        return;
    }
    appState.user = newName;
    $("#username").text(appState.user);

    hide($("#takeUsername"), $("#modalOverlayMask"));
    $('#newMessageField').focus();
}

function sendMessage(message, continueWith) {
    post(appState.mainUrl, JSON.stringify(message), function() {
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
    var history = appState.history;
    history.push(message);

    var resultMessageDiv = tmplMessage({
        time: getHourMinutes(message.date),
        name: message.user,
        text: message.text
    });

    $("#history").append(resultMessageDiv);
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}

var tmplMessage = _.template('<div class="messageConteiner">\
            <div class="k1">\
                <div class="time">\
                    <%=time%>\
                </div>\
                <div class="deleteMarker">\
                    <i class="fa fa-trash"></i>\
                </div>\
            </div>\
            <div class="k2">\
                <div class="name">\
                    <%=name%>\
                </div>\
                <div class="text">\
                    <%=text%>\
                </div>\
            </div>\
            <div class="k3">\
                <i class="fa fa-arrow-right"></i>\
            </div>\
        </div>');
