var uniqueId = function() {
    var date = Date.now();
    var random = Math.random() * Math.random();
    return Math.floor(date * random).toString();
};

function getHourMinutes(utcNumberDate) {
    var date = new Date(utcNumberDate);
    var hour = date.getHours();
    var min = date.getMinutes();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    return hour + ":" + min;
}

function onEnterPressed(field, action) {
    field.keypress(function(e) {
        if (e.which == 13) {
            action();
        }
    });
}

function scrollBottom(elem) {
    elem.scrollTop(elem.get(0).scrollHeight);
}
