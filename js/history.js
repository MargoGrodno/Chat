var states = [];

function getToken() {
    return states.length;
};

function addMessage(message) {
    states.push(message);
};

function getMessagesFrom(token) {
    return states.slice(token, states.length);
};

function markMsgAsDeleted(msgId) {
    states.push({
        msgId: msgId,
        isDeleted: true
    });
};

module.exports = {
    hist: states,
    getMessagesFrom: getMessagesFrom,
    getToken: getToken,
    addMessage: addMessage,
    markMsgAsDeleted: markMsgAsDeleted
};
