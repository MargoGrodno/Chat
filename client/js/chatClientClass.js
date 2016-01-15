
function ChatClient() {
    this.token = 0;
    this.abortFn = null;
}

Emitter(ChatClient.prototype);

ChatClient.prototype.run = function(url) {
    this.mainUrl = url;
    addEventListerers();
    var self = this;

    function loop() {
        var abortFn = self.getMessages.call(self, function() {
            setTimeout(function() {
                loop.apply(self);
            }, 1000);
        })
        self.abortFn = function () {
            abortFn();
            self.emit('abort');
        } 
    }
    loop();
}

ChatClient.prototype.getMessages = function(continueWith) {
    var url = 'http://' + this.mainUrl + '?token=' + this.token;
    var self = this;

    var abortFn = this.get(url, function(responseText) {
        var response = JSON.parse(responseText);
        self.token = response.token;
        self.emit('historyChanged', response.messages);
        continueWith();
    }, function(error) {
        console.log(error);
        self.emit('error', error);
        continueWith();
    });
    return abortFn;
};

ChatClient.prototype.postMessage = function(msgText) {
    var message = theMessage(msgText);
    this.post('http://' + client.mainUrl,
        JSON.stringify(message),
        function() {
            console.log('Message sent ' + msgText);
        },
        defaultErrorHandler);
};

ChatClient.prototype.editMessage = function(msgId, newText) {
    this.put('http://' + client.mainUrl,
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
    this.delete('http://' + client.mainUrl + '/' + messageId,
        JSON.stringify({
            id: messageId,
            method: "delete"
        }),
        function() {
            console.log('Message deleted ' + messageId);
        },
        defaultErrorHandler);
};

ChatClient.prototype.rollbackMessage = function(messageId, continueWith) {
    this.delete('http://' + client.mainUrl + '/' + messageId,
        JSON.stringify({
            id: messageId,
            method: "rollback"
        }),
        function() {
            console.log('Message rollback ' + messageId);
        },
        defaultErrorHandler);
};

ChatClient.prototype.get = function(url, continueWith, continueWithError) {
    var abortFn = ajax('GET', url, null, continueWith, continueWithError);
    return abortFn;
};

ChatClient.prototype.post = function(url, data, continueWith, continueWithError) {
    ajax('POST', url, data, continueWith, continueWithError);
};

ChatClient.prototype.put = function(url, data, continueWith, continueWithError) {
    ajax('PUT', url, data, continueWith, continueWithError);
};

ChatClient.prototype.delete = function(url, data, continueWith, continueWithError) {
    ajax('DELETE', url, data, continueWith, continueWithError);
};

var theMessage = function(text) {
    var date = new Date();
    return {
        userId: app.userId,
        userName: app.userName,
        date: date.getTime(),
        text: text
    };
};