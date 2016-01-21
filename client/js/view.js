'use strict';

var tmplMessageOwn = _.template(document.getElementById('msg-template-own').innerHTML);
var tmplMessageAlien = _.template(document.getElementById('msg-template-alien').innerHTML);

function View(app) {
    this.app = app;

    Emitter(this);
    this.addEventListerers();
    this.updateViewName();
};

View.prototype.update = function() {
    this.updateViewName();
};

View.prototype.showErrorMessage = function (message) {
    $("#offline").text(message);
    $("#offline").show(1000);
};

View.prototype.hideErrorMessage = function() {
    $("#offline").hide("slow");
};

View.prototype.cleanHistory = function() {
    $("#history").empty();
};

View.prototype.updateViewName = function() {
    $("#username").text(this.app.userName);
};

View.prototype.putText = function(msgId, text) {
    $("#" + msgId + " > .k2 > .text").text(text);
};

View.prototype.removeMessage = function(msgId) {
    $("#" + msgId).remove();
};

View.prototype.scrollBottom = function(elem) {
    elem.scrollTop(elem.get(0).scrollHeight);
};

View.prototype.openChangeServerPopup = function() {
    var curentUrl = this.app.client.mainUrl;
    $('#curentServer').text(curentUrl);
    $("#changeServer").show();
    $("#modalOverlayMask").show();
    $('#serverAddressField').val(curentUrl);
    $('#serverAddressField').focus();
};

View.prototype.closeChangeServerPopup = function() {
    $("#changeServerErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#changeServer").hide();
    $('#newMessageField').focus();
};

View.prototype.openChangeNamePopup = function() {
    $("#changeName").show();
    $("#modalOverlayMask").show();
    $('#nameField').focus();
};

View.prototype.closeNamePopup = function() {
    $("#nameErrorMessage").hide();
    $("#modalOverlayMask").hide();
    $("#changeName").hide();
    $('#newMessageField').focus();
};

View.prototype.showEditField = function(msgId) {
    $('#newMessage').css("display", "none");

    $('#editMessage').css("display", "block");
    $('#editMessage').attr("msgId", msgId);

    $("#editMessageField").val($("#" + msgId + " > .k2 > .text").text());
    $('#editMessageField').focus();

    $("#" + msgId).css("background-color", "#ffecdc");
};

View.prototype.closeEditField = function() {
    var editMsgId = $('#editMessage').attr("msgId");
    $("#" + editMsgId).css("background-color", "");
    $('#editMessage').removeAttr("msgId");

    $('#editMessage').css("display", "none");
    $("#editMessageField").val("");

    $('#newMessage').css("display", "block");
    $('#newMessageField').focus();
};

View.prototype.onEditButtonClick = function(msgId) {
    this.closeEditField();
    this.showEditField(msgId);
};

View.prototype.addMessageInternal = function(message) {
    var curentTmpl;

    if (message.userId == this.app.userId) {
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

    this.makeEventsForOwnBtns(message);
    this.makeCorrectMsgView(message);
    this.scrollBottom($("#history"));
};

View.prototype.editMessageInternal = function(message) {
    this.makeCorrectMsgView(message);
    this.scrollBottom($("#history"));
};

View.prototype.sendEdit = function() {
    var newText = $("#editMessageField").val();
    var editMsgId = $('#editMessage').attr("msgId");
    this.closeEditField();
    this.emit('editMessage', editMsgId, newText);
};

View.prototype.sendNewMessage = function() {
    var msgText = $("#newMessageField").val();
    if (msgText == '')
        return;
    $("#newMessageField").val("");
    this.emit('newMessage', msgText);
};

View.prototype.changeServer = function() {
    var newAddress = $("#serverAddressField").val();
    if (newAddress == '') {
        $("#changeServerErrorMessage").text("You can't save empty address!");
        $("#changeServerErrorMessage").show();
        return;
    }
    this.closeChangeServerPopup();
    this.emit('serverChanged', newAddress);
};

View.prototype.changeName = function() {
    var newName = $("#nameField").val();
    if (newName == '') {
        $("#nameErrorMessage").text("You can't save empty name!");
        $("#nameErrorMessage").show();
        return;
    }
    this.closeNamePopup();
    this.emit('userNameChanged', newName);
};

View.prototype.makeEventsForOwnBtns = function(message) {
    var self = this;
    if (message.userId == this.app.userId) {
        $("#" + message.msgId + " > .k3 > .editBtn").on("click", function() {
            self.onEditButtonClick(message.msgId);
        });
        $("#" + message.msgId + " > .k3 > .deleteBtn").on("click", function() {
            self.emit('deleteMessage', message.msgId);
        });
        $("#" + message.msgId + " > .k3 > .rollbackBtn").on("click", function() {
            self.emit('rollbackMessage', message.msgId);
        });
    }
};

View.prototype.displayMarker = function(markerClass, id, isVisible) {
    var marker = $("#" + id + " > .k1 > " + markerClass);
    if (isVisible) {
        marker.removeClass("hidden");
        return;
    }
    marker.addClass("hidden");
};

View.prototype.displayBtn = function(btnClass, id, isVisible) {
    var button = $("#" + id + " > .k3 > " + btnClass);
    if (isVisible) {
        button.removeClass("hidden");
        return;
    }
    button.addClass("hidden");
};

View.prototype.addEventListerers = function() {
    var self = this;

    onEnterPressed($("#newMessageField"), function() {
        self.sendNewMessage();
    });
    $("#sendMsgButton").on('click', function() {
        self.sendNewMessage();
    });

    ifEmpty($("#editMessageField"), this.closeEditField);
    onEnterPressed($("#editMessageField"), function() {
        self.sendEdit();
    });
    $("#sendEditButton").on('click', function() {
        self.sendEdit();
    });

    $("#settingsButton").on("click", function() {
        self.openChangeServerPopup();
    });
    onEnterPressed($("#serverAddressField"), function() {
        self.changeServer();
    });
    $("#changeServerButton").on("click", function() {
        self.changeServer();
    });
    $("#cancelChangeServerButton").on("click", this.closeChangeServerPopup);

    $("#profileButton").on("click", this.openChangeNamePopup);
    onEnterPressed($("#nameField"), function() {
        self.changeName();
    });
    $("#changeNameButton").on("click", function() {
        self.changeName();
    });
    $("#cancelNameButton").on("click", this.closeNamePopup);
};

View.prototype.makeCorrectMsgView = function(message) {
    var msgId = message.msgId;

    this.putText(msgId, message.text);
    this.displayMarker(".editMarker", msgId, message.isEdit);
    this.displayMarker(".deleteMarker", msgId, message.isDeleted);

    if (message.isDeleted) {
        this.putText(msgId, "(*deleted*)");
        this.displayMarker(".editMarker", msgId, false);
    }

    if (message.userId == this.app.userId) {
        this.displayBtn(".rollbackBtn", msgId, true);

        if (message.isDeleted) {
            this.displayBtn(".editBtn", msgId, false);
            this.displayBtn(".deleteBtn", msgId, false);
        }
        if (!message.isDeleted) {
            this.displayBtn(".editBtn", msgId, true);
            this.displayBtn(".deleteBtn", msgId, true);
        }
        if (message.isEdit) {
            this.displayBtn(".editBtn", msgId, false);
        }
    }
    if (message.userId != this.app.userId) {
        if (message.isDeleted) {
            this.displayBtn(".citeBtn", msgId, false);
        }
        if (!message.isDeleted) {
            this.displayBtn(".citeBtn", msgId, true);
        }
    }
};

function ifEmpty(field, continueWith) {
    field.keyup(function() {
        var value = $(this).val();
        if (value == "") {
            continueWith();
        }
    }).keyup();
};

function onEnterPressed(field, action) {
    field.keypress(function(e) {
        if (e.which == 13) {
            action();
        }
    });
};
