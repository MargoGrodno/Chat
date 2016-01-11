var http = require('http');
var util = require('util');
var assert = require('assert');
var url = require('url');
var getIp = require('./getIp');
var historyMod = require('./history');

var history = new historyMod.History();
var toBeResponded = [];

var ip = getIp();

var handlerMap = {
    "GET": getHandler,
    "OPTIONS": optionsHandler,
    "DELETE": deleteHandler,
    "POST": postHandler,
    "PUT": putHandler
};

var errStatusMap = {
    "Deleting non-existent message": 422,
    "Rollback non-existent message": 422,
    "Nothing for rollback": 422,
    "Unsuported operation": 400,
    "Wrong token": 422,
    "Unsuported http request": 501,
    "Bad Request": 400
}

var server = http.createServer(function(req, res) {
    console.log('method: ' + req.method + ", " + req.url);

    var handler = handlerMap[req.method];
    if (handler == undefined) {
        responseWith(res, Error("Unsuported http request"));
    }

    handlerMap[req.method](req, res, function(err) {
        responseWith(res, err);
    });
});

function responseWith(response, body) {
    if (body instanceof Error) {
        responseWithError(response, body);
        return;
    }

    var statusCode = 200;
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE'
    });
    if (body) {
        response.write(JSON.stringify(body));
    }
    response.end();
}

function responseWithError(response, err) {
    var statusCode = errStatusMap[err.message];
    if (statusCode == undefined) {
        statusCode = 400;
    }

    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    response.write(JSON.stringify(err.message));
    response.end();
}

function remaineWait(token, continueWith) {
    toBeResponded.push({
        token: token,
        continueWith: continueWith
    });
}

function getHandler(req, res, continueWith) {
    var urlToken = getUrlToken(req.url);
    
    if (urlToken == undefined) {
        continueWith(Error("Bad Request"));
        return;
    }

    history.getMessages(urlToken, function(err) {
        if (err) {
            continueWith(err);
        } else {
            remaineWait(urlToken, continueWith)
        }
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
    awaitBody(req, function(message) {
        history.editMessage(message, function(err) {
            if (err) {
                continueWith(err);
            } else {
                respondAll();
                continueWith();
            }
        });
    });
}

function deleteHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.deleteMessage(message, function(err) {
            if (err) {
                continueWith(err);
            } else {
                respondAll();
                continueWith();
            }
        });
    });
}

function respondAll() {
    toBeResponded.forEach(function(waiter) {
        var body = {
            token: history.getToken(),
            messages: history.getMessagesFrom(waiter.token)
        };
        waiter.continueWith(body);
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
