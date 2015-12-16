var states = [];

function getToken() {
    return states.length;
};

function getMessagesFrom(token) {
    return states.slice(token, states.length);
};

function addMessage(message, continueWith) {
    states.push({
        msgId: uniqueId(),
        action: "add",
        userId: message.userId,
        userName: message.userName,
        date: message.date,
        text: message.text,
        isDeleted: false,
    });
    continueWith();
};

function deleteMsg(msgId, continueWith) { // Проверить, возможно сообщение уже удалено. Тогда ошибка.
    if (!isExist(msgId)) {
        continueWith("Deleting non-existent message");
        return;
    }

    states.push({
        msgId: msgId,
        isDeleted: true,
        action: "delete"
    });
    continueWith();
};

function takeLastUnrevokeState(msgId) {
    var z = takeLastUnrevokeStateBefore(msgId, states.length);
    return z;
}

function takeLastUnrevokeStateBefore(msgId, indexBefore) {
    var indLastState = indexLastMsgStateBefore(msgId, indexBefore);
    if (states[indLastState].action == "revoke") {
        var  g = takeLastUnrevokeStateBefore(msgId, states[indLastState].rollbackState);
        return g;
    } else {
        return indLastState;
    }
}

function indexLastMsgStateBefore(msgId, indexFrom) {
    for (var i = indexFrom - 1; i >= 0; i--) {
        if (states[i].msgId == msgId) {
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

    var rollbackState = states[indLastUnrSt];

    if (rollbackState.action == "add") {
        states.push({
            msgId: rollbackState.msgId,
            action: "revoke",
            revokingAction: "add",
            rollbackState: indLastUnrSt
        });
        continueWith();
    }

    if (rollbackState.action == "delete") {

        var indStateBeforeDelete = takeLastUnrevokeStateBefore(msgId, indLastUnrSt);
        var oldText = states[indStateBeforeDelete].text;

        states.push({
            msgId: rollbackState.msgId,
            action: "revoke",
            revokingAction: "delete",
            rollbackState: indLastUnrSt,
            text: oldText
        });
        continueWith();
    }
}

function isExist(msgId) {
    for (var i = states.length - 1; i >= 0; i--) {
        if (states[i].msgId == msgId) {
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
    getMessagesFrom: getMessagesFrom,
    getToken: getToken,
    addMessage: addMessage,
    deleteMsg: deleteMsg,
    rollback: rollback
};
