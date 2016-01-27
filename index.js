var server = require('./server/js/server');

var port = (process.env.PORT || 31337);
server.startServer(port);