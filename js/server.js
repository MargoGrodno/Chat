var http = require('http');
var history = [];
var util = require('util');
var toBeResponded = [];
var assert = require('assert');
var url = require('url');
var getIp = require('./getIp');

var ip = getIp();
var port = 31338;

var server = http.createServer(function(req, res) {

    console.log('method: ' + req.method);

    if (req.method == 'GET') {
        getHandler(req, res);
        return;
    }
    if (req.method == 'POST') {
        postHandler(req, res);
        return;
    }
});

function getHandler(req, res) {
    var token = getToken(req.url);

    if (isFutureToken(token)) {
        responseWith(res, 401, token, null);
        return;
    }

    if (isPastToken(token)) {
        var messages = history.slice(token, history.length);
        responseWith(res, 200, history.length, messages);
        return;
    }

    console.assert(isActualToken(token));
    
    toBeResponded.push({
        res: res,
        token: token
    });
}

function getToken(u) {
    var parts = url.parse(u, true);
    return parts.query.token;
}

function isPastToken(token){
    return token < history.length;
}

function isActualToken(token) {
    return token == history.length;
}

function isFutureToken (token) {
	return token > history.length
}

function answerAll() {
    toBeResponded.forEach(function(waiter) {
        var token = waiter.token;
        responseWith(waiter.res, 200, history.length, history.slice(token, history.length));
        waiter.res.end();
    });
    toBeResponded = [];
}

function responseWith(response, statusCode, token, messages) {
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    if (messages != null) {

        response.write(JSON.stringify({
            token: token,
            messages: messages
        }));
    };
    response.end();
}

function postHandler(req, res) {
    onDataComplete(req, function(message) {
    	message.msgId = uniqueId();
        console.log("post message: " +
            message.user + ", " + message.text + ", " + getHourMinutes(message.date)+ ", " + message.msgId);
        history.push(message);
        answerAll();
        res.writeHeader(200, {
            'Access-Control-Allow-Origin': '*'
        });
        res.end();
    });
}

function onDataComplete(req, handler) {
    var message = '';
    req.on('data', function(data) {
        message += data.toString();
    });

    req.on('end', function() {
        handler(JSON.parse(message));
    });
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min  = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}

function uniqueId() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

server.listen(port, ip);
server.setTimeout(0);
console.log('Server running at http://' + ip + ':' + port);
