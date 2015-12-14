var states = [];

function getToken() {
    return states.length;
};

function getMessagesFrom(token) {
    return states.slice(token, states.length);
};

function addMessage(message, continueWith) {
    if (!isExist(message.msgId)) {
        message.msgId = uniqueId();
        message.isDeleted = false;
        states.push(message);
        continueWith();
    } else {
        continueWith("Adding existing message");
    }
};

function deleteMsg(msgId, continueWith) {
    if (isExist(msgId)) {
        states.push({
            msgId: msgId,
            isDeleted: true
        });
        continueWith();
    } else {
        continueWith("Deleting non-existent message");
    }
};

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
    deleteMsg: deleteMsg
};
