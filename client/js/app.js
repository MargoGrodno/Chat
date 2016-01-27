'use strict';

var model = new Model();
var client = new ChatClient;
var view = new View(model);

view.on('userNameChanged', function(newName) {
    model.changeName(newName);
}).on('serverChanged', function(newUrl) {
    model.changeServer(newUrl);
    changeServer(model.serverUrl);
}).on('newMessage', function(text) {
    var message = model.theMessage(text);
    client.postMessage(message);
}).on("editMessage", function(msgId, newText) {
    client.editMessage(msgId, newText);
}).on('deleteMessage', function(id) {
    client.deleteMessage(id);
}).on('rollbackMessage', function(id) {
    client.rollbackMessage(id);
});

model.on('chatStateChanged', function() {
    localStorage.setItem('ChatState', model.persistableState());
    view.update();
}).on('historyChanged', function() {
    view.hideErrorMessage();
}).on('messageAdded', function(message) {
    view.addMessage(message);
}).on('messageEdited', function(message) {
    view.editMessage(message);
}).on('messageDeleted', function(messageId) {
    view.removeMessage(messageId);
}).on('abort', function() {
    view.cleanHistory();
}).on('error', function(message) {
    view.showErrorMessage(message);
});

document.onreadystatechange = function() {
    if (document.readyState == "complete") {
        changeServer(model.serverUrl);
    }
};

window.onerror = function(err) {
    view.showErrorMessage(err.toString());
};

function changeServer (serverUrl) {
    client.abortFn && client.abortFn();
    client = new ChatClient();

    client.on('error', function(message) {
        model.errorHandler(message);
    });
    client.on('historyChanged', function(delta) {
        model.updateHistory(delta);
    });    
    client.on('abort', function() {
        model.emit('abort');
        client.off('error');
        client.off('historyChanged');
        client.off('abort');
    });

    client.run(serverUrl);
}