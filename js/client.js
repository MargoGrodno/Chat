'use strict';

var ip = '192.168.100.6';
var port = '31337';

var theMessage = function(text) {
    var date = new Date();
    return {
        userId: client.userId,
        userName: client.userName,
        date: date.getTime(),
        text: text
    };
};

function ChatClient() {
    this.userName = 'Guest_' + uniqueId();
    this.userId = uniqueId();
    this.token = 0;
    this.abortFn = null;
}

ChatClient.prototype.connect = function(url) {
    this.mainUrl = url;
}

ChatClient.prototype.run = function(url) {
    addEventListerers();

    var thisObj = this;

    function loop() {
        var url = 'http://' + thisObj.mainUrl + '?token=' + thisObj.token;

        var abortFn = get(url, function(responseText) {
            $("#offline").hide("slow");

            var response = JSON.parse(responseText);
            thisObj.token = response.token;
            thisObj.trigger('historyChanged', response.messages);
            setTimeout(function() {
                loop.apply(thisObj);
            }, 1000);

        }, function(error) {
            console.log(error);
            thisObj.trigger('error', error);
            setTimeout(function() {
                loop.apply(thisObj);
            }, 1000);
        });
        thisObj.abortFn = abortFn;
    }

    loop();
}

ChatClient.prototype.post = function(msgText) {
    var message = theMessage(msgText);
    post('http://' + client.mainUrl,
        JSON.stringify(message),
        function() {
            console.log('Message sent ' + msgText);
        },
        defaultErrorHandler);
};

ChatClient.prototype.editMessage = function(msgId, newText) {
    put('http://' + client.mainUrl,
        JSON.stringify({
            id: msgId,
            text: newText
        }),
        function() {
            console.log('Message edit ' + msgId + "  " + newText);
        },
        defaultErrorHandler);
};

ChatClient.prototype.deleteMessage = function(messageId) {
    del('http://' + client.mainUrl + '/' + messageId,
        JSON.stringify({
            id: messageId,
            method: "delete"
        }),
        function() {
            console.log('Message deleted ' + messageId);
        },
        defaultErrorHandler);
};


ChatClient.prototype.rollback = function(messageId, continueWith) {
    del('http://' + client.mainUrl + '/' + messageId,
        JSON.stringify({
            id: messageId,
            method: "rollback"
        }),
        function() {
            console.log('Message rollback ' + messageId);
        },
        defaultErrorHandler);
};

Emitter(ChatClient.prototype);

ChatClient.prototype.on('error', function(error) {
    defaultErrorHandler(error);
});

ChatClient.prototype.on('historyChanged', function(deltaMessages) {
    updateHistory(deltaMessages);
});

var client = new ChatClient();
client.connect(ip + ':' + port);
document.addEventListener("DOMContentLoaded", function() {
    client.run();
});


function changeServer(newAddress) {
    client.abortFn();
    cleanHistory();

    client = new ChatClient();
    client.connect(newAddress);
    client.run();
}

function defaultErrorHandler(message) {
    var error = 'ERROR:\n' + message + '\n';
    $("#offline").text(error);
    $("#offline").show(1000);
    console.error(message);
}

window.onerror = function(err) {
    defaultErrorHandler(err.toString());
}

function addEventListerers() {
    onEnterPressed($("#newMessageField"), onSendButtonClick);
    $("#sendMsgButton").on('click', onSendButtonClick);

    onEnterPressed($("#editMessageField"), onSendEditButtonClick);
    $("#sendEditButton").on('click', onSendEditButtonClick);

    $("#settingsButton").on("click", function() {
        openChangeServerPopup(client.mainUrl);
    });
    onEnterPressed($("#serverAddressField"), onChangeServerButtonClick)
    $("#changeServerButton").on("click", onChangeServerButtonClick);
    $("#cancelChangeServerButton").on("click", closeChangeServerPopup);

    onEnterPressed($("#nameField"), onChangeNameButtonClick);
    $("#changeNameButton").on("click", onChangeNameButtonClick);
    $("#cancelNameButton").on("click", closeNamePopup);
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
    scrollBottom($("#history"));
}

function editMessageInternal(message) {
    if (!message.isExist) {
        $("#" + message.msgId).remove();
        return;
    };

    makeCorrectMsgView(message);
    scrollBottom($("#history"));
}

function makeEventsForBtns(message) {
    if (message.userId == client.userId) {
        $("#" + message.msgId + " > .k3 > .editBtn").on("click", function() {

            $('#newMessage').css("display", "none");
            $('#editMessage').css("display", "block");

            $("#editMessageField").val($("#" + message.msgId + " > .k2 > .text").text());
            $('#editMessageField').focus();
            $("#" + message.msgId).css("background-color", "#ffecdc");
            $('#editMessage').attr("msgId", message.msgId);
        });
        $("#" + message.msgId + " > .k3 > .deleteBtn").on("click", function() {
            client.deleteMessage(message.msgId);
        });
        $("#" + message.msgId + " > .k3 > .rollbackBtn").on("click", function() {
            client.rollback(message.msgId);
        });
    }
};

function onSendEditButtonClick() {
    var newText = $("#editMessageField").val();
    $("#editMessageField").val("");
    
    var msgId = $('#editMessage').attr("msgId");
    client.editMessage(msgId, newText);

    $("#" + msgId).css("background-color", "");
    $('#newMessage').css("display", "block");
    $('#editMessage').css("display", "none");
    $('#newMessageField').focus();
}

function onSendButtonClick() {
    var msgText = $("#newMessageField").val();
    if (msgText == '')
        return;
    $("#newMessageField").val("");

    client.post(msgText);
}

function changeName(name) {
    client.userName = name;
    $("#username").text(client.userName);
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

function onChangeServerButtonClick() {
    var newAddress = $("#serverAddressField").val();
    if (newAddress == '') {
        $("#changeServerErrorMessage").text("You can't save empty address!");
        $("#changeServerErrorMessage").show();
        return;
    }

    changeServer(newAddress);
    closeChangeServerPopup();
}
