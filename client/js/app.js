'use strict';

function App() {
    this.userId = uniqueId();
    this.userName = 'Guest_' + uniqueId();
    this.serverUrl = '192.168.100.6:31337';
    this.history = [];
    this.client = null;
    Emitter(this);

    this.setOptions();
}

App.prototype.setOptions = function() {
    var appState = JSON.parse(localStorage.getItem("AppState"));
    if (appState) {
        this.userName = appState.name;
        this.serverUrl = appState.url;
    }
}

App.prototype.persistableState = function() {
    return JSON.stringify({
        name: this.userName,
        url: this.serverUrl
    });
}

App.prototype.startApplication = function() {
    this.changeServer(this.serverUrl);
}

App.prototype.changeName = function(name) {
    this.userName = name;
    this.emit('appStateChanged');
}

App.prototype.changeServer = function(newAddress) {
    var self = this;

    this.serverUrl = newAddress;
    this.history = [];

    this.client && this.client.abortFn();
    this.client = new ChatClient(this);
    this.client.on('error', function(message) {
        self.errorHandler(message);
    });
    this.client.on('historyChanged', function(delta) {
        self.updateHistory(delta);
    });
    this.client.on('abort', function() {
        self.onAbort();
    });

    this.emit('appStateChanged');
    this.client.run(this.serverUrl);
}

App.prototype.onAbort = function() {
    var self = this;

    this.emit('abort');

    this.client.off('error');
    this.client.off('historyChanged');
    this.client.off('abort');
}

App.prototype.errorHandler = function(message) {
    var error = 'ERROR:\n' + message + '\n';
    console.error(message);

    this.emit('error', error);
};

App.prototype.updateHistory = function(newMessages) {
    for (var i = 0; i < newMessages.length; i++) {
        this.updateOrCreate(newMessages[i]);
    }
    this.emit('historyChanged');
}

App.prototype.updateOrCreate = function(message) {
    for (var i = 0; i < this.history.length; i++) {
        if (this.history[i].msgId != message.msgId)
            continue;

        this.updateMessage(i, message);
        return;
    };
    this.createMessage(message);
}

App.prototype.createMessage = function(newMessage) {
    this.history.push(newMessage);
    this.emit('messageAdded', newMessage);
}

App.prototype.updateMessage = function(indexMsg, newState) {
    if (!newState.isExist) {
        this.history.splice(indexMsg, 1);
        this.emit('messageDeleted', newState.msgId);
        return;
    };

    this.history[indexMsg] = newState;
    this.emit('messageEdited', newState);
}

App.prototype.theMessage = function(text) {
    var date = new Date();
    return {
        userId: this.userId,
        userName: this.userName,
        date: date.getTime(),
        text: text
    };
};
