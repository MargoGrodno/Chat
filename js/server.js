var http = require('http');
var util = require('util');
var assert = require('assert');
var url = require('url');
var getIp = require('./getIp');

var history = [];
var toBeResponded = [];

var ip = getIp();
var port = 31337;

var server = http.createServer(function(req, res) {
    console.log('method: ' + req.method + ", " + req.url);

    if (req.method == 'OPTIONS') {
        optionsHandler(req, res);
        return;
    }
    if (req.method == 'GET') {
        getHandler(req, res);
        return;
    }
    if (req.method == 'POST') {
        postHandler(req, res);
        return;
    }
    if (req.method == 'PUT') {
        putHandler(req, res);
        return;
    }
    if (req.method == 'DELETE') {
        deleteHandler(req, res);
        return;
    }
});

function getHandler(req, res) {
    var token = getToken(req.url);

    if (isFutureToken(token)) {
        var body = {
            token: token
        }; //[token, null];
        responseWith(res, 401, "post", body);
        return;
    }
    if (isPastToken(token)) {
        var messages = history.slice(token, history.length);
        var body = {
            token: history.length,
            messages: messages
        }; //[history.length, messages];
        responseWith(res, 200, "post", body);
        return;
    }

    console.assert(isActualToken(token));

    toBeResponded.push({
        res: res,
        token: token
    });
}

function postHandler(req, res) {
    onDataComplete(req, function(message) {
        message.msgId = uniqueId();
        message.isDeleted = false;

        history.push(message);
        answerAll();

        res.writeHeader(200, {
            'Access-Control-Allow-Origin': '*'
        });
        res.end();
    });
}

function optionsHandler(req, res) {
    res.writeHeader(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end("");
}

function putHandler(req, res) {
    console.log("put");
}

function deleteHandler(req, res) {
    onDataComplete(req, function(message) {
        console.log(message);

        markMsgAsDeleted(message.id);
        deleteMsgForAll(message.id);

        res.writeHeader(200, {
            'Access-Control-Allow-Origin': '*'
        });
        res.end();
    });
}

function deleteMsgForAll(msgId) {
    toBeResponded.forEach(function(waiter) {
        var body = {
            msgId: msgId
        }; // [-1, msgId];
        responseWith(waiter.res, 200, "delete", body);
        waiter.res.end();
    });
    toBeResponded = [];
}

function markMsgAsDeleted(msgId) {
    var numRequiredMsq;
    for (var i = history.length - 1; i >= 0; i--) {
        if (history[i].msgId == msgId) {
            numRequiredMsq = i;
        }
    };

    history[numRequiredMsq].text = "(*deleted*)";
    history[numRequiredMsq].isDeleted = true;
}

function getToken(u) {
    var parts = url.parse(u, true);
    return parts.query.token;
}

function isPastToken(token) {
    return token < history.length;
}

function isActualToken(token) {
    return token == history.length;
}

function isFutureToken(token) {
    return token > history.length
}

function answerAll() {
    toBeResponded.forEach(function(waiter) {
        var token = waiter.token;
        var body = {
            token: history.length,
            messages: history.slice(token, history.length)
        }; //[history.length, history.slice(token, history.length)];
        responseWith(waiter.res, 200, "post", body);
        waiter.res.end();
    });
    toBeResponded = [];
}

function responseWith(response, statusCode, method, body) {
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    //var token = body[0];
    //var messages = body[1];

    if (method == "post") {
        response.write(JSON.stringify({
            method: method,
            //token: token,
            //messages: messages
            body: body
        }));
    }
    if (method == "delete") {
        response.write(JSON.stringify({
            method: method,
            //msgId: messages
            body: body
        }));
    }
    response.end();
}


function onDataComplete(req, handler) {
    var reqBody = '';
    req.on('data', function(data) {
        reqBody += data.toString();
    });

    req.on('end', function() {
        handler(JSON.parse(reqBody));
    });
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}

function uniqueId() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

function startServerOnArbitraryPort() {
    takePortForStart(function(incomingPort) {
        port = incomingPort;
        startServer();
    }, function() {
        startServer();
    });
}

function startServer() {
    server.listen(port, ip);
    server.setTimeout(0);
    console.log('Server running at http://' + ip + ':' + port);
}

function createRL() {
    var readline = require('readline');
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    return rl;
}

function isStrIsNumber(str) {
    var regex = new RegExp(/^[0-9]+$/);
    return regex.test(str);
}

function takePortForStart(succeed, failure) {
    var rl = createRL();
    console.log('Enter port for server ');

    rl.on('line', function(incomingStr) {
        rl.close();
        if (isStrIsNumber(incomingStr)) {
            succeed(Number(incomingStr));
        } else {
            console.log(incomingStr + ' is not a number');
            failure()
        }
    });
};

startServerOnArbitraryPort();
