function isError(text) {
    if (text == "")
        return false;

    try {
        var obj = JSON.parse(text);
    } catch (ex) {
        return true;
    }

    return !!obj.error;
}

function ajax(method, url, data, continueWith, continueWithError) {
    var xhr = new XMLHttpRequest();

    continueWithError = continueWithError || defaultErrorHandler;
    xhr.open(method || 'GET', url, true);

    xhr.onload = function() {
        if (xhr.readyState !== 4)
            return;
        if (xhr.status != 200) {
            continueWithError('Error on the server side, response ' + xhr.status + ", " + xhr.responseText);
            return;
        }
        if (isError(xhr.responseText)) {
            continueWithError('Error on the server side, response ' + xhr.responseText);
            return;
        }
        continueWith(xhr.responseText);
    };

    xhr.ontimeout = function() {
        сontinueWithError('Server timed out !');
    };

    xhr.onerror = function(e) {
        var errMsg = 'Server connection error http://' + url + '\n' +
            '\n' +
            'Check if \n' +
            '- server is active\n' +
            '- server sends header "Access-Control-Allow-Origin:*"';
        console.log(e);
        continueWithError(errMsg);
    };
    xhr.send(data);

    function abortFn() {
        xhr.abort();
    }
    return abortFn;
}