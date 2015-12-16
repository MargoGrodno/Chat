var http = require('http');
var util = require('util');
var assert = require('assert');
var url = require('url');
var getIp = require('./getIp');
var history = require('./history');

var toBeResponded = [];

var ip = getIp();

var server = http.createServer(function(req, res) {
    console.log('method: ' + req.method + ", " + req.url);

    if (req.method == 'GET') {
        getHandler(req, res);
        return;
    }
    if (req.method == 'OPTIONS') {
        optionsHandler(req, res, function() {
            sendResponse(res);
        });
        return;
    }
    if (req.method == 'POST') {
        postHandler(req, res, function(err) {
            sendResponse(res, err);
        });
        return;
    }
    if (req.method == 'PUT') {
        putHandler(req, res, function(err) {
            sendResponse(res, err);
        });
        return;
    }
    if (req.method == 'DELETE') {
        deleteHandler(req, res, function(err) {
            sendResponse(res, err);
        });
        return;
    }
});

function sendResponse(res, err) {
    if (err) {
        responseWith(res, 422, err);
        return;
    }
    responseWith(res, 200);
}

function responseWith(response, statusCode, body) {
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE'
    });
    if (body) {
        response.write(JSON.stringify(body));
    }
    response.end();
}

function getHandler(req, res) {
    var token = getUrlToken(req.url);

    if (isFutureToken(token)) {
        var body = {
            token: token
        };
        responseWith(res, 422, body);
        return;
    }
    if (isPastToken(token)) {
        var messages = history.getMessagesFrom(token);
        var body = {
            token: history.getToken(),
            messages: messages
        };
        responseWith(res, 200, body);
        return;
    }
    console.assert(isActualToken(token));

    remaneWait(res, token);
}

function remaneWait(res, token) {
    toBeResponded.push({
        res: res,
        token: token
    });
}

function postHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.addMessage(message, function(err) {
            if (err) {
                continueWith(err);
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
}

function deleteHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        if (message.method == "delete") {
            history.deleteMsg(message.id, function(err) {
                if (err) {
                    continueWith(err);
                } else {
                    respondAll();
                    continueWith();
                }
            });
            return;
        }
        if (message.method == "rollback") {
            history.rollback(message.id, function(err) {
                if (err) {
                    continueWith(err);
                } else {
                    respondAll();
                    continueWith();
                }
            });
            return;
        }
    });
}

function isPastToken(token) {
    return token < history.getToken();
}

function isActualToken(token) {
    return token == history.getToken();
}

function isFutureToken(token) {
    return token > history.getToken();
}

function respondAll() {
    toBeResponded.forEach(function(waiter) {
        var body = {
            token: history.getToken(),
            messages: history.getMessagesFrom(waiter.token)
        };
        responseWith(waiter.res, 200, body);
        waiter.res.end();
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
