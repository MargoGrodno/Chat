'use strict';

var ip = '192.168.100.6';
var port = '31337';


function App() {
    this.userName = 'Guest_' + uniqueId();
    this.userId = uniqueId();
    this.history = [];
}

function changeServer(newAddress) {
    client && client.abortFn();

    client = new ChatClient();

    client.on('error', defaultErrorHandler);
    client.on('historyChanged', updateHistory);
    client.on('abort', onAbort);

    client.run(newAddress);
}

function onAbort() {
    cleanHistory();

    client.off('error', defaultErrorHandler);
    client.off('historyChanged', updateHistory);
    client.off('abort', onAbort);
}

function updateHistory(newMessages) {
    for (var i = 0; i < newMessages.length; i++) {
        updateOrCreate(newMessages[i]);
    }
}

function updateOrCreate(message) {
    for (var i = 0; i < app.history.length; i++) {
        if (app.history[i].msgId == message.msgId) {
            updateMessage(app.history, i, message);
            return;
        }
    };
    createMessage(app.history, message);
}

function createMessage(history, newMessage){
    history.push(newMessage);
    addMessageInternal(newMessage);
}

function updateMessage(history, indexMsg, newState) {
    if (!newState.isExist) {
        history.splice(indexMsg, 1);
        removeMessage(newState.msgId);
        return;
    };

    history[indexMsg] = newState;
    editMessageInternal(newState);
}

function changeName(name) {
    app.userName = name;
    $("#username").text(app.userName);
}




function onEditButtonClick(msgId) {
    var attr = $('#editMessage').attr('msgId');
    if (typeof attr !== typeof undefined && attr !== false) {
        closeEditField(attr);
    }

    showEditField(msgId);
}

function onSendEditButtonClick() {
    var newText = $("#editMessageField").val();
    var msgId = $('#editMessage').attr("msgId");

    closeEditField(msgId);

    client.editMessage(msgId, newText);
}

function onSendButtonClick() {
    var msgText = $("#newMessageField").val();
    if (msgText == '')
        return;
    $("#newMessageField").val("");

    client.postMessage(msgText);
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

function addEventListerers() {
    onEnterPressed($("#newMessageField"), onSendButtonClick);
    $("#sendMsgButton").on('click', onSendButtonClick);

    onEnterPressed($("#editMessageField"), onSendEditButtonClick);
    $("#sendEditButton").on('click', onSendEditButtonClick);
    $("#editMessageField").keyup(function() {
        var value = $(this).val();
        var editMsgId = $('#editMessage').attr("msgId");
        if (value == "") {
            closeEditField(editMsgId);
        }
    }).keyup();

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

window.onerror = function(err) {
    defaultErrorHandler(err.toString());
}

function defaultErrorHandler(message) {
    var error = 'ERROR:\n' + message + '\n';
    $("#offline").text(error);
    $("#offline").show(1000);
    console.error(message);
}




var client;
var app = new App();

document.onreadystatechange = function() {
    if (document.readyState == "complete") {
        changeServer(ip + ':' + port);
    }
}
