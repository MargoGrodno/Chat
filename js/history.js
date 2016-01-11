'use strict';

function History() {
    this.operations = [];
}

History.prototype.addMessage = function(message, continueWith) {
    this.operations.push({
        msgId: uniqueId(),
        action: "add",
        userId: message.userId,
        userName: message.userName,
        date: message.date,
        text: message.text
    });
    continueWith();
};

History.prototype.editMessage = function(message, continueWith) {
    var msgId = message.id;

    if (!this.isExist(msgId)) {
        continueWith(Error("Deleting non-existent message"));
        return;
    }

    this.operations.push({
        msgId: msgId,
        action: "edit",
        text: message.text,
        oldText: this.operations[this.findLastOperation(msgId)].text
    });
    continueWith();
};

History.prototype.deleteMessage = function(message, continueWith) {
    var msgId = message.id;

    if (message.method == "rollback") {
        this.rollback(message.id, continueWith);
        return;
    }
    if (message.method !== "delete") {
        continueWith(Error("Unsuported operation"));
        return;
    }
    if (!this.isExist(msgId)) {
        continueWith(Error("Deleting non-existent message"));
        return;
    }

    this.operations.push({
        msgId: msgId,
        action: "delete",
        text: this.operations[this.findLastOperation(msgId)].text
    });

    continueWith();
};

History.prototype.rollback = function(msgId, continueWith) {
    if (!this.isExist(msgId)) {
        continueWith(Error("Rollback non-existent message"));
        return;
    }
    var indRollbackOperation = this.findLastOperation(msgId);

    if (indRollbackOperation == -1) {
        continueWith(Error("Nothing for rollback"));
        return;
    }
    var rollbackOperation = this.operations[indRollbackOperation];

    var newOperation = {
        msgId: msgId,
        action: "rollback",
        indRollbackOperation: indRollbackOperation
    };

    this.operations.push(newOperation);
    continueWith();
}

History.prototype.getMessages = function(token, continueWith) {
    if (this.isFutureToken(token)) {
        continueWith(Error("Wrong token"));
        return;
    }
    if (this.isPastToken(token)) {
        var messages = this.getMessagesFrom(token);
        var body = {
            token: this.getToken(),
            messages: messages
        };
        continueWith(body);
        return;
    }
    if (!this.isActualToken(token)) {
        continueWith(Error("Wrong token"));
        return;
    }
    continueWith();
}

History.prototype.getMessagesFrom = function(token) {
    var reqOperations = this.operations.slice(token, this.operations.length);
    var messages = [];
    var self = this;

    for (var i = 0; i < reqOperations.length; i++) {
        var curentOperation = reqOperations[i];
        var indexCurMsg = indexElemInArr(messages, curentOperation.msgId);

        if (indexCurMsg == -1) {
            messages.push({
                msgId: curentOperation.msgId,
                userId: this.getUserIdByMsgId(curentOperation.msgId),
                text: "",
                action: "edit",
                isExist: true,
                isDeleted: false,
                isEdit: false
            });
            indexCurMsg = messages.length - 1;
        }
        var editedMsg = messages[indexCurMsg];

        switch (curentOperation.action) {
            case "add":
                recordAddParametrs(editedMsg, curentOperation);
                continue;
            case "delete":
                editedMsg.isDeleted = true;
                continue;
            case "edit":
                editedMsg.text = curentOperation.text;
                editedMsg.isEdit = true;
                continue;
            case "rollback":
                recordRollbackParametrs(self, curentOperation.indRollbackOperation, editedMsg, function() {
                    messages.splice(indexCurMsg, 1)
                });
                break;
            default:
                throw new Error("not handled operation" + curentOperation.action);
        }
    };
    console.log(messages);
    return messages;
};

function recordAddParametrs(editedMsg, operation) {
    editedMsg.text = operation.text;
    editedMsg.action = "add";
    editedMsg.userName = operation.userName;
    editedMsg.date = operation.date;
}

function recordRollbackParametrs(self, indRollbackOperation, editedMsg, deleteState) {
    var rollbackOperation = self.operations[indRollbackOperation];
    if (rollbackOperation.action == "add") {
        editedMsg.isExist = false;
        if (editedMsg.action == "add") {
            deleteState();
        }
        return;
    }
    if (rollbackOperation.action == "delete") {
        editedMsg.isDeleted = false;
        editedMsg.text = rollbackOperation.text;

        var indLastOperation = self.findLastOperation(editedMsg.msgId, indRollbackOperation);
        var lastOperation = self.operations[indLastOperation];
        if (lastOperation.action == "edit") {
            editedMsg.isEdit = true;
        }

        return;
    }
    if (rollbackOperation.action == "edit") {
        editedMsg.isEdit = false;
        editedMsg.text = rollbackOperation.oldText;
        return;
    }
    throw new Error("not handled rollback of operation" + rollbackOperation.action);
}

History.prototype.getToken = function() {
    return this.operations.length;
};

History.prototype.isPastToken = function(token) {
    return token < this.getToken();
}

History.prototype.isActualToken = function(token) {
    return token == this.getToken();
}

History.prototype.isFutureToken = function(token) {
    return token > this.getToken();
}

History.prototype.findLastOperation = function(msgId, indexBefore) {
    if (indexBefore === undefined) {
        var indexBefore = this.operations.length;
    }
    var indLastOperation = this.indexLastMsgOperationBefore(msgId, indexBefore);
    if (indLastOperation == -1) {
        return -1;
    }
    if (this.operations[indLastOperation].action == "rollback") {
        var indLastRollback = this.operations[indLastOperation].indRollbackOperation;
        return this.findLastOperation(msgId, indLastRollback);
    } else {
        return indLastOperation;
    }
}

History.prototype.indexLastMsgOperationBefore = function(msgId, indexFrom) {
    for (var i = indexFrom - 1; i >= 0; i--) {
        if (this.operations[i].msgId == msgId) {
            return (i);
        }
    };
    return (-1);
}

History.prototype.getUserIdByMsgId = function(msgId) {
    for (var i = 0; i < this.operations.length; i++) {
        if (this.operations[i].msgId == msgId) {
            return this.operations[i].userId;
        }
    };
    return -1;
}

History.prototype.isExist = function(msgId) {
    for (var i = this.operations.length - 1; i >= 0; i--) {
        if (this.operations[i].msgId == msgId) {
            return true;
        }
    };
    return false;
}

function uniqueId() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

function indexElemInArr(arr, elemId) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].msgId == elemId) {
            return i;
        }
    };
    return -1;
}

module.exports = {
    History: History
};
