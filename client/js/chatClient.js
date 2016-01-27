'use strict';

function ChatClient() {
    this.token = 0;
    this.abortFn = null;
    Emitter(this);
}

ChatClient.prototype.run = function(url) {
    this.mainUrl = url;
    var self = this;
    var abortFn = null;
    var wasAborted = false;

    function abort() {
        abortFn && abortFn();
        abortFn = null;
        wasAborted = true;
        self.emit('abort');
    }

    this.abortFn = abort;

    function loop() {
        if (wasAborted) {
            return;
        }
        abortFn = self.getMessages.call(self, function() {
            setTimeout(function() {
                loop.apply(self);
            }, 1000);
        });
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
        self.emit('error', error);
        continueWith();
    });
    return abortFn;
};

ChatClient.prototype.postMessage = function(message) {
    this.post('http://' + this.mainUrl,
        JSON.stringify(message),
        function() {
            console.log('Message sent ' + message.text);
        },
        function(error) {
            self.emit('error', error);
        });
};

ChatClient.prototype.editMessage = function(msgId, newText) {
    this.put('http://' + this.mainUrl,
        JSON.stringify({
            id: msgId,
            text: newText
        }),
        function() {
            console.log('Message edit ' + msgId + "  " + newText);
        },
        function(error) {
            self.emit('error', error);
        });
};

ChatClient.prototype.deleteMessage = function(messageId) {
    this.delete('http://' + this.mainUrl + '/' + messageId,
        JSON.stringify({
            id: messageId,
            method: "delete"
        }),
        function() {
            console.log('Message deleted ' + messageId);
        },
        function(error) {
            self.emit('error', error);
        });
};

ChatClient.prototype.rollbackMessage = function(messageId, continueWith) {
    this.delete('http://' + this.mainUrl + '/' + messageId,
        JSON.stringify({
            id: messageId,
            method: "rollback"
        }),
        function() {
            console.log('Message rollback ' + messageId);
        },
        function(error) {
            self.emit('error', error);
        });
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
