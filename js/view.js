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

function closeNamePopup() {
    $("#nameErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#takeUsername").hide();
    $('#newMessageField').focus();
}

function cleanHistory() {
    $("#history").empty();
}

function makeCorrectMsgView(message) {
    var messageId = message.msgId;
    
    $("#" + messageId + " > .k2 > .text").text(message.text);

    if (message.isDeleted) {
        $("#" + messageId + " > .k2 > .text").text("(*deleted*)");
        $("#" + messageId + " > .k1 > .deleteMarker").css("display", "block");
    }
    if (!message.isDeleted) {
        $("#" + messageId + " > .k1 > .deleteMarker").css("display", "none");
    }
    if (message.isEdit) {
        $("#" + messageId + " > .k1 > .editMarker").css("display", "block");
    }
    if (!message.isEdit) {
        $("#" + messageId + " > .k1 > .editMarker").css("display", "none");
    }

    if (message.userId == client.userId) {
        $("#" + message.msgId + " > .k3 > .rollbackBtn").css("display", "block");
        if (message.isDeleted) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "none");
            $("#" + messageId + " > .k3 > .deleteBtn").css("display", "none");
        }
        if (!message.isDeleted) {
            $("#" + messageId + " > .k3 > .editBtn").css("display", "block");
            $("#" + messageId + " > .k3 > .deleteBtn").css("display", "block");
        }
    }
    if (message.userId != client.userId) {
        if (message.isDeleted) {
            $("#" + messageId + " > .k3 > .citeBtn").css("display", "none");
        }
        if (!message.isDeleted) {
            $("#" + messageId + " > .k3 > .citeBtn").css("display", "block");
        }
    }
}
