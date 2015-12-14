var hist = [];

function getToken() {
    return this.hist.length;
};

function addMessage(message) {
    this.hist.push(message);
};

function getMessagesFrom(token) {
    return this.hist.slice(token, this.hist.length);
};

function markMsgAsDeleted(msgId) {
    var numRequiredMsq;
    for (var i = this.hist.length - 1; i >= 0; i--) {
        if (this.hist[i].msgId == msgId) {
            numRequiredMsq = i;
            break;
        }
    };
    this.hist[numRequiredMsq].text = "(*deleted*)";
    this.hist[numRequiredMsq].isDeleted = true;
};

module.exports = {
	hist: hist,
	getMessagesFrom: getMessagesFrom,
	getToken: getToken,
	addMessage: addMessage,
	markMsgAsDeleted:markMsgAsDeleted
};
