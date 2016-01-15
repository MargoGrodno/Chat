var tmplMessageOwn = _.template(document.getElementById('msg-template-own').innerHTML);
var tmplMessageAlien = _.template(document.getElementById('msg-template-alien').innerHTML);

function hideErrorMessage() {
    $("#offline").hide("slow");
}

function cleanHistory() {
    $("#history").empty();
}

function updateViewName () {
    $("#username").text(app.userName);
}

function removeMessage(msgId) {
    $("#" + msgId).remove();
}

function openChangeServerPopup(curentUrl) {
    $('#curentServer').text(curentUrl);
    $("#changeServer").show();
    $("#modalOverlayMask").show();
    $('#serverAddressField').val(curentUrl);
    $('#serverAddressField').focus();
}

function closeChangeServerPopup() {
    $("#changeServerErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#changeServer").hide();
    $('#newMessageField').focus();
}

function openChangeNamePopup() {
    $("#changeName").show();
    $("#modalOverlayMask").show();
    $('#nameField').focus();
}

function closeNamePopup() {
    $("#nameErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#changeName").hide();
    $('#newMessageField').focus();
}

function showEditField(msgId) {
    $('#newMessage').css("display", "none");

    $('#editMessage').css("display", "block");
    $('#editMessage').attr("msgId", msgId);
    $("#editMessageField").val($("#" + msgId + " > .k2 > .text").text());
    $('#editMessageField').focus();

    $("#" + msgId).css("background-color", "#ffecdc");
}

function closeEditField(msgId) {
    $('#editMessage').css("display", "none");
    $('#editMessage').removeAttr("msgId");
    $("#editMessageField").val("");
    $("#" + msgId).css("background-color", "");

    $('#newMessage').css("display", "block");
    $('#newMessageField').focus();
}

function addMessageInternal(message) {
    var curentTmpl;

    if (message.userId == app.userId) {
        curentTmpl = tmplMessageOwn;
    } else {
        curentTmpl = tmplMessageAlien;
    }

    var resultMessageDiv = curentTmpl({
        time: getHourMinutes(message.date),
        name: message.userName,
        text: message.text,
        id: message.msgId
    });

    $("#history").append(resultMessageDiv);

    makeEventsForOwnBtns(message);
    makeCorrectMsgView(message);
    scrollBottom($("#history"));
}

function editMessageInternal(message) {
    makeCorrectMsgView(message);
    scrollBottom($("#history"));
}

function makeEventsForOwnBtns(message) {
    if (message.userId == app.userId) {
        $("#" + message.msgId + " > .k3 > .editBtn").on("click", function() {
            onEditButtonClick(message.msgId);
        });
        $("#" + message.msgId + " > .k3 > .deleteBtn").on("click", function() {
            client.deleteMessage(message.msgId);
        });
        $("#" + message.msgId + " > .k3 > .rollbackBtn").on("click", function() {
            client.rollbackMessage(message.msgId);
        });
    }
};

function makeCorrectMsgView(message) {
    var messageId = message.msgId;

    $("#" + messageId + " > .k2 > .text").text(message.text);

    if (message.isEdit) {
        $("#" + messageId + " > .k1 > .editMarker").css("display", "block");
    }
    if (!message.isEdit) {
        $("#" + messageId + " > .k1 > .editMarker").css("display", "none");
    }

    if (message.isDeleted) {
        $("#" + messageId + " > .k2 > .text").text("(*deleted*)");
        $("#" + messageId + " > .k1 > .deleteMarker").css("display", "block");
        $("#" + messageId + " > .k1 > .editMarker").css("display", "none");
    }
    if (!message.isDeleted) {
        $("#" + messageId + " > .k1 > .deleteMarker").css("display", "none");
    }

    if (message.userId == app.userId) {
        $("#" + message.msgId + " > .k3 > .rollbackBtn").css("display", "block");

        if (message.isDeleted) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "none");
            $("#" + messageId + " > .k3 > .deleteBtn").css("display", "none");
        }
        if (!message.isDeleted) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "block");
            $("#" + messageId + " > .k3 > .deleteBtn").css("display", "block");
        }

        if (message.isEdit) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "none");
        }

    }
    if (message.userId != app.userId) {
        if (message.isDeleted) {
            $("#" + messageId + " > .k3 > .citeBtn").css("display", "none");
        }
        if (!message.isDeleted) {
            $("#" + messageId + " > .k3 > .citeBtn").css("display", "block");
        }
    }
}