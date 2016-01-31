'use strict';
var numberRegexp = new RegExp(/^[0-9]+$/);

function History() {
    this.operations = [];
}

History.prototype.getToken = function() {
    var token = this.operations.length;
    return encodeToken(token);
};

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
        continueWith(Error("Edit non-existent message"));
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

History.prototype.getMessages = function(encodedToken, continueWith) {
    var token = decodeToken(encodedToken);

    if (isFutureToken.call(this, token)) {
        continueWith(null, Error("Wrong token"));
        return;
    }
    if (isPastToken.call(this, token)) {
        var messages = getMessagesFrom.call(this, token);
        continueWith(messages);
        return;
    }
    if (!isActualToken.call(this, token)) {
        continueWith(null, Error("Wrong token format"));
        return;
    }
    continueWith();
}

function isAddAtThisPart(token, indAdd) {
    return indAdd >= token;
}

function getMessagesFrom(token) {
    var reqOperations = this.operations.slice(token, this.operations.length);
    var messages = [];
    var self = this;

    for (var i = 0; i < reqOperations.length; i++) {
        var curentOperation = reqOperations[i];

        var indEditedMsg = findOrCreate(messages, curentOperation.msgId, function() {
            return {
                msgId: curentOperation.msgId,
                userId: self.getUserIdByMsgId(curentOperation.msgId),
                text: "",
                isExist: true,
                isDeleted: false,
                isEdit: false
            }
        });

        var editedMsg = messages[indEditedMsg];

        if (curentOperation.action == "rollback") {
            applyRollback(self, editedMsg, curentOperation, messages, indEditedMsg, token);
            continue;
        };

        applyChanges(editedMsg, curentOperation);
    };
    console.log(messages);
    return messages;
};

function applyRollback(self, editedMsg, operation, messages, indEditedMsg, token) {
    var indRollbackOperation = operation.indRollbackOperation;
    var rollbackOperation = self.operations[indRollbackOperation];

    if (rollbackOperation.action == "add") {
        if (isAddAtThisPart(token, indRollbackOperation)) {
            messages.splice(indEditedMsg, 1);
            return;
        }
        editedMsg.isExist = false;
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

function applyChanges(editedMsg, operation) {
    switch (operation.action) {
        case "add":
            editedMsg.text = operation.text;
            editedMsg.userName = operation.userName;
            editedMsg.date = operation.date;
            break;
        case "delete":
            editedMsg.isDeleted = true;
            break;
        case "edit":
            editedMsg.text = operation.text;
            editedMsg.isEdit = true;
            break;
        default:
            throw new Error("not handled operation" + operation.action);
    }
}

function isPastToken(token) {
    var encodedToken = this.getToken();
    return token < decodeToken(encodedToken);
}

function isActualToken(token) {
    var encodedToken = this.getToken();
    return token == decodeToken(encodedToken);
}

function isFutureToken(token) {
    var encodedToken = this.getToken();
    return token > decodeToken(encodedToken);
}

History.prototype.findLastOperation = function(msgId, startIndex) {
    if (startIndex === undefined) {
        var startIndex = this.operations.length;
    }
    var indLastOperation = this.findPrevOperation(msgId, startIndex);
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

History.prototype.findPrevOperation = function(msgId, startIndex) {
    for (var i = startIndex - 1; i >= 0; i--) {
        if (this.operations[i].msgId != msgId)
            continue;
        
        return (i);
    };
    return (-1);
}

History.prototype.getUserIdByMsgId = function(msgId) {
    for (var i = 0; i < this.operations.length; i++) {
        if (this.operations[i].msgId != msgId) 
            continue;
            
        return this.operations[i].userId;       
    };
    return -1;
}

History.prototype.isExist = function(msgId) {
    for (var i = this.operations.length - 1; i >= 0; i--) {
        if (this.operations[i].msgId != msgId) 
            continue;
        
        return true;
    };
    return false;
}

function findOrCreate(array, msgId, createFn) {
    var indexElem = indexInArr(array, msgId);
    if (indexElem == -1) {
        var elem = createFn();
        array.push(elem);
        return (array.length - 1);
    }
    return indexElem;
};

function uniqueId() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

function indexInArr(arr, msgId) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].msgId != msgId)
            continue;

        return i;
    };
    return -1;
}

function encodeToken(token) {
    var str = token.toString();
    return new Buffer(str).toString('base64');
}

function decodeToken(code) {
    if (code == 0) {
        return 0;
    }
    var result = new Buffer(code, 'base64').toString('ascii');

    if (!isStrIsNumber(result)) {
        throw new Error("Wrong token");
    }
    return Number(result);
}

function isStrIsNumber(str) {
    return numberRegexp.test(str);
}

module.exports = {
    History: History
};
