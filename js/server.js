var http = require('http');
var util = require('util');
var assert = require('assert');
var url = require('url');
var getIp = require('./getIp');
var historyMod = require('./history');

var history = new historyMod.History();
var toBeResponded = [];

var ip = getIp();

var server = http.createServer(function(req, res) {
    console.log('method: ' + req.method + ", " + req.url);

    if (req.method == 'GET') {
        getHandler(req, res, function(statusCode, err) {
            responseWith(res, statusCode, err);
        });
        return;
    }
    if (req.method == 'OPTIONS') {
        optionsHandler(req, res, function(statusCode, err) {
            responseWith(res, statusCode, err);
        });
        return;
    }
    if (req.method == 'POST') {
        postHandler(req, res, function(statusCode, err) {
            responseWith(res, statusCode, err);
        });
        return;
    }
    if (req.method == 'PUT') {
        putHandler(req, res, function(statusCode, err) {
            responseWith(res, statusCode, err);
        });
        return;
    }
    if (req.method == 'DELETE') {
        deleteHandler(req, res, function(statusCode, err) {
            responseWith(res, statusCode, err);
        });
        return;
    }
    responseWith(res, 501);
});

function responseWith(response, statusCode, body) {
    if (!statusCode) {
        statusCode = 200;
    }
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE'
    });
    if (body) {
        response.write(JSON.stringify(body));
    }
    response.end();
}

function getHandler(req, res, continueWith) {
    var urlToken = getUrlToken(req.url);

    if (history.isFutureToken(urlToken)) {
        continueWith(422, "Wrong token");
        return;
    }
    if (history.isPastToken(urlToken)) {
        var messages = history.getMessagesFrom(urlToken);
        var body = {
            token: history.getToken(),
            messages: messages
        };
        continueWith(200, body);
        return;
    }
    console.assert(history.isActualToken(urlToken));

    remaineWait(urlToken, continueWith);
}

function remaineWait(token, continueWith) {
    toBeResponded.push({
        token: token,
        continueWith: continueWith
    });
}

function postHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.addMessage(message, function(statusCode, err) {
            if (statusCode) {
                continueWith(statusCode, err);
            } else {
                respondAll();
                continueWith();
            }
        });
    });
}

function optionsHandler(req, res, continueWith) {
    continueWith();
}

function putHandler(req, res, continueWith) {
    console.log("put");
    continueWith(501, "Unsuported method");
}

function deleteHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.deleteMsg(message, function(statusCode, err) {
            if (statusCode) {
                continueWith(statusCode, err);
            } else {
                respondAll();
                continueWith();
            }
        });
        return;
    });
}

function respondAll() {
    toBeResponded.forEach(function(waiter) {
        var body = {
            token: history.getToken(),
            messages: history.getMessagesFrom(waiter.token)
        };
        waiter.continueWith(200, body);
    });
    toBeResponded = [];
}

function awaitBody(req, handler) {
    var reqBody = '';
    req.on('data', function(data) {
        reqBody += data.toString();
    });

    req.on('end', function() {
        handler(JSON.parse(reqBody));
    });
}

function getUrlToken(u) {
    var parts = url.parse(u, true);
    return parts.query.token;
}

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}

function startServerOnArbitraryPort(defaultPort) {
    takePortForStart(function(incomingPort) {
        startServer(incomingPort);
    }, function() {
        startServer(defaultPort);
    });
}

function startServer(port) {
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

startServerOnArbitraryPort(31337);
