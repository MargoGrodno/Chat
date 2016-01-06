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
        var errMsg = 'Server connection error http://' + client.mainUrl + '\n' +
            '\n' +
            'Check if \n' +
            '- server is active\n' +
            '- server sends header "Access-Control-Allow-Origin:*"';

        continueWithError(errMsg);
    };
    xhr.send(data);

    function abortFn() {
        xhr.abort();
    }
    return abortFn;
}

function get(url, continueWith, continueWithError) {
    var abortFn = ajax('GET', url, null, continueWith, continueWithError);
    return abortFn;
}

function post(url, data, continueWith, continueWithError) {
    ajax('POST', url, data, continueWith, continueWithError);
}

function put(url, data, continueWith, continueWithError) {
    ajax('PUT', url, data, continueWith, continueWithError);
}

function del(url, data, continueWith, continueWithError) {
    ajax('DELETE', url, data, continueWith, continueWithError);
}
