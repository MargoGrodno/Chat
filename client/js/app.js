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

App.prototype.startApplication = function() {
    this.changeServer(this.serverUrl);
}

App.prototype.persistableState = function() {
    return JSON.stringify({
        name: this.userName,
        url: this.serverUrl
    });
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
    this.client = new ChatClient();
    this.client.on('error', defaultErrorHandler);
    this.client.on('historyChanged', function(delta) {
        self.updateHistory(delta);
    });
    this.client.on('abort', function() {
        self.onAbort();
    });

    this.client.run(this.serverUrl);
    this.emit('appStateChanged');
}

App.prototype.onAbort = function() {
    var self = this;

    this.emit('abort');

    this.client.off('error', defaultErrorHandler);
    this.client.off('historyChanged', self.updateHistory);
    this.client.off('abort', self.onAbort);
}

App.prototype.updateHistory = function(newMessages) {
    for (var i = 0; i < newMessages.length; i++) {
        this.updateOrCreate(newMessages[i]);
    }
    this.emit('historyChanged');
}

App.prototype.updateOrCreate = function(message) {
    for (var i = 0; i < app.history.length; i++) {
        if (app.history[i].msgId != message.msgId)
            continue;

        this.updateMessage(app.history, i, message);
        return;
    };
    this.createMessage(app.history, message);
}

App.prototype.createMessage = function(history, newMessage) {
    history.push(newMessage);
    this.emit('messageAdded', newMessage);
}

App.prototype.updateMessage = function(history, indexMsg, newState) {
    if (!newState.isExist) {
        history.splice(indexMsg, 1);
        this.emit('messageDeleted', newState.msgId);
        return;
    };

    history[indexMsg] = newState;
    this.emit('messageEdited', newState);
}
