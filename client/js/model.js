'use strict';

function Model() {
    this.userId = uniqueId();
    this.userName = 'Guest_' + uniqueId();
    this.serverUrl = '192.168.100.6:31337';
    this.history = [];
    Emitter(this);

    this.restoreState();
}

Model.prototype.restoreState = function() {
    var chatState = JSON.parse(localStorage.getItem("ChatState"));
    if (chatState) {
        this.userName = chatState.name;
        this.serverUrl = chatState.url;
    }
}

Model.prototype.persistableState = function() {
    return JSON.stringify({
        name: this.userName,
        url: this.serverUrl
    });
}

Model.prototype.changeName = function(name) {
    this.userName = name;
    this.emit('chatStateChanged');
}

Model.prototype.changeServer = function(newAddress) {
    this.serverUrl = newAddress;
    this.history = [];

    this.emit('chatStateChanged');
}

Model.prototype.errorHandler = function(message) {
    var error = 'ERROR:\n' + message + '\n';
    console.error(message);

    this.emit('error', error);
};

Model.prototype.updateHistory = function(newMessages) {
    for (var i = 0; i < newMessages.length; i++) {
        this.updateOrCreate(newMessages[i]);
    }
    this.emit('historyChanged');
}

Model.prototype.updateOrCreate = function(message) {
    for (var i = 0; i < this.history.length; i++) {
        if (this.history[i].msgId != message.msgId)
            continue;

        this.updateMessage(i, message);
        return;
    };
    this.createMessage(message);
}

Model.prototype.createMessage = function(newMessage) {
    this.history.push(newMessage);
    this.emit('messageAdded', newMessage);
}

Model.prototype.updateMessage = function(indexMsg, newState) {
    if (!newState.isExist) {
        this.history.splice(indexMsg, 1);
        this.emit('messageDeleted', newState.msgId);
        return;
    };

    this.history[indexMsg] = newState;
    this.emit('messageEdited', newState);
}

Model.prototype.theMessage = function(text) {
    var date = new Date();
    return {
        userId: this.userId,
        userName: this.userName,
        date: date.getTime(),
        text: text
    };
};
