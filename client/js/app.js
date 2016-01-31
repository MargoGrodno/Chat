'use strict';

function App() {
    this.model = new Model();
    this.client = new ChatClient();
    this.view = new View(this.model);

    var self = this;

    this.view.on('userNameChanged', function(newName) {
        self.model.changeName(newName);
    }).on('serverChanged', function(newUrl) {
        self.model.changeServer(newUrl);
        self.changeServer(self.model.serverUrl);
    }).on('newMessage', function(text) {
        var message = self.model.theMessage(text);
        self.client.postMessage(message);
    }).on("editMessage", function(msgId, newText) {
        self.client.editMessage(msgId, newText);
    }).on('deleteMessage', function(id) {
        self.client.deleteMessage(id);
    }).on('rollbackMessage', function(id) {
        self.client.rollbackMessage(id);
    });

    this.model.on('chatStateChanged', function() {
        localStorage.setItem('ChatState', self.model.persistableState());
        self.view.update();
    }).on('historyChanged', function() {
        self.view.hideErrorMessage();
    }).on('messageAdded', function(message) {
        self.view.addMessage(message);
    }).on('messageEdited', function(message) {
        self.view.editMessage(message);
    }).on('messageDeleted', function(messageId) {
        self.view.removeMessage(messageId);
    }).on('abort', function() {
        self.view.cleanHistory();
    }).on('error', function(message) {
        self.view.showErrorMessage(message);
    });
}

App.prototype.onError = function (err) {
    this.view.showErrorMessage(err.toString());
}

App.prototype.changeServer = function () {
    var self = this;

    this.client.abortFn && this.client.abortFn();
    this.client = new ChatClient();

    this.client.on('error', function(message) {
        self.model.errorHandler(message);
    });
    this.client.on('historyChanged', function(delta) {
        self.model.updateHistory(delta);
    });
    this.client.on('abort', function() {
        self.model.emit('abort');
        self.client.off('error');
        self.client.off('historyChanged');
        self.client.off('abort');
    });

    this.client.run(this.model.serverUrl);
}