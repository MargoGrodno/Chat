'use strict';

var app = new App();

document.onreadystatechange = function() {
    if (document.readyState == "complete") {
        app.changeServer();
    }
};

window.onerror = function(err) {
    app.onError(err);
};