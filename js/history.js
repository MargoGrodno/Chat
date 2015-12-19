var operations = [];

function getToken() {
    return operations.length;
};

function getMessagesFrom(token) {
    return operations.slice(token, operations.length);
};

function addMessage(message, continueWith) {
    operations.push({
        msgId: uniqueId(),
        action: "add",
        userId: message.userId,
        userName: message.userName,
        date: message.date,
        text: message.text
    });
    continueWith();
};

function deleteMsg(message, continueWith) { // Проверить, возможно сообщение уже удалено. Тогда ошибка.
    var msgId = message.id;

    if (message.method == "rollback") {
        rollback(message.id, continueWith);
        return;
    }

    if (message.method !== "delete") {
        continueWith("unsuported delete method");
        return;
    }

    if (!isExist(msgId)) {
        continueWith("Deleting non-existent message");
        return;
    }

    operations.push({
        msgId: msgId,
        action: "delete"
    });
    continueWith();
};

function takeLastUnrevokeState(msgId) {
    return takeLastUnrevokeStateBefore(msgId, operations.length);
}

function takeLastUnrevokeStateBefore(msgId, indexBefore) {
    var indLastState = indexLastMsgStateBefore(msgId, indexBefore);
    if (operations[indLastState].action == "revoke") {
        return takeLastUnrevokeStateBefore(msgId, operations[indLastState].rollbackState);
    } else {
        return indLastState;
    }
}

function indexLastMsgStateBefore(msgId, indexFrom) {
    for (var i = indexFrom - 1; i >= 0; i--) {
        if (operations[i].msgId == msgId) {
            return (i);
        }
    };
    return (-1);
}

function rollback(msgId, continueWith) {
    if (!isExist(msgId)) {
        continueWith("Rollback non-existent message");
        return;
    }
    var indLastUnrSt = takeLastUnrevokeState(msgId);

    if (indLastUnrSt == -1) {
        continueWith("Nothing for rollback");
        return;
    }
    var revocableState = operations[indLastUnrSt];

    var newState = {
        msgId: msgId,
        userId: getUserIdByMsgId(msgId),
        action: "revoke",
        revocableAction: revocableState.action,
        rollbackState: indLastUnrSt
    };

    if (revocableState.action == "delete") {
        var indStateBeforeDelete = takeLastUnrevokeStateBefore(msgId, indLastUnrSt);
        var oldText = operations[indStateBeforeDelete].text;
        newState.text = oldText;
    }

    operations.push(newState);
    continueWith();
}

function getUserIdByMsgId(msgId) {
    for (var i = 0; i < operations.length; i++) {
        if (operations[i].msgId == msgId) {
            return operations[i].userId;
        }
    };
    return -1;
}

function isExist(msgId) {
    for (var i = operations.length - 1; i >= 0; i--) {
        if (operations[i].msgId == msgId) {
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

function isPastToken(token) {
    return token < getToken();
}

function isActualToken(token) {
    return token == getToken();
}

function isFutureToken(token) {
    return token > getToken();
}

module.exports = {
    getMessagesFrom: getMessagesFrom,
    getToken: getToken,
    addMessage: addMessage,
    deleteMsg: deleteMsg,
    rollback: rollback,
    isPastToken: isPastToken,
    isActualToken: isActualToken,
    isFutureToken: isFutureToken
};
