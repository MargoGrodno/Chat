'use strict';

function history() {
	this.operations = [];
	console.log("constructor run");
}

history.prototype.getToken = function () {
    return this.operations.length;
};

history.prototype.getMessagesFrom= function (token) {
    return this.operations.slice(token, this.operations.length);
};

history.prototype.isPastToken=  function (token)  {
    return token < this.getToken();
}

history.prototype.isActualToken =  function (token) {
    return token == this.getToken();
}

history.prototype.isFutureToken =  function (token) {
    return token > this.getToken();
}

history.prototype.addMessage =  function (message, continueWith) {
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

history.prototype.deleteMsg=  function (message, continueWith) { // Проверить, возможно сообщение уже удалено. Тогда ошибка.
    var msgId = message.id;

    if (message.method == "rollback") {
        this.rollback(message.id, continueWith);
        return;
    }
    if (message.method !== "delete") {
        continueWith(400, "unsuported operation");
        return;
    }
    if (!this.isExist(msgId)) {
        continueWith(422, "Deleting non-existent message");
        return;
    } 

    this.operations.push({
        msgId: msgId,
        action: "delete"
    });
    continueWith();
};

history.prototype.findLastState = function (msgId, indexBefore) {  // МЕТОДЫ С ЭТОГО И НИЖЕ НЕ БУДУТ РАБОТАТЬ!!! ПЕРЕДЕЛАТЬ ПОД ОБЪЕКТЫ
	if (!indexBefore) {
		var indexBefore = this.operations.length;
	}
    var indLastState = this.indexLastMsgStateBefore(msgId, indexBefore);
    if (this.operations[indLastState].action == "revoke") {
    	var indLastRevoke  = this.operations[indLastState].rollbackState;
        return this.findLastState(msgId, indLastRevoke);
    } else {
        return indLastState;
    }
}

history.prototype.indexLastMsgStateBefore= function (msgId, indexFrom)  {
    for (var i = indexFrom - 1; i >= 0; i--) {
        if (this.operations[i].msgId == msgId) {
            return (i);
        }
    };
    return (-1);
}

history.prototype.rollback= function (msgId, continueWith)  {
    if (!this.isExist(msgId)) {
        continueWith(422, "Rollback non-existent message");
        return;
    }
    var indLastState = this.findLastState(msgId);

    if (indLastState == -1) {
        continueWith(422, "Nothing for rollback");
        return;
    }
    var revocableState = this.operations[indLastState];

    var newState = {
        msgId: msgId,
        userId: this.getUserIdByMsgId(msgId),
        action: "revoke",
        revocableAction: revocableState.action,
        rollbackState: indLastState
    };

    if (revocableState.action == "delete") {
        var indStateBeforeDelete = this.findLastState(msgId, indLastState);
        var oldText = this.operations[indStateBeforeDelete].text;
        newState.text = oldText;
    }

    this.operations.push(newState);
    continueWith();
}

history.prototype.getUserIdByMsgId = function (msgId){
    for (var i = 0; i < this.operations.length; i++) {
        if (this.operations[i].msgId == msgId) {
            return this.operations[i].userId;
        }
    };
    return -1;
}

history.prototype.isExist = function (msgId) {
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


module.exports = {
	history:history
};
