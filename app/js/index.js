'use strict';

var fs = require("fs");

$(document).ready(function()
{
    $("#jquery_jplayer_1").jPlayer({
        ready: function()
        {
            $(this).jPlayer("setMedia",
            {
                title: "Smokin",
                //mp3: "res/Bit Rush.mp3",
                m4a: "res/Boston/Boston/Smokin.m4a",
            });
        },
        cssSelectorAncestor: "#jp_container_1",
        swfPath: "/js",
        supplied: "m4a",
        useStateClassSkin: true,
        autoBlur: false,
        smoothPlayBar: true,
        keyEnabled: true,
        remainingDuration: true,
        toggleDuration: true,
    });
});


function startup()
{
    loadMusic();
    loadUsers();
    loadChat();
    loadNowPlaying();
}

function loadMusic()
{
    fs.readdir("res/", function(err, files)
    {

    });
}

function loadUsers()
{

}

function loadChat()
{

}

function loadNowPlaying()
{

}

// Switch channels
$(".channel").mousedown(function(event)
{
    console.log("hey");
    if(event.which == 3)
    {
        alert("Right Click - channel options");
    }
    if(event.which == 1)
    {
        alert("Left Click - Change Channel")
    }
});

function addChannel()
{
    alert("Which Channel To Add?");
}

function resizeWindow()
{
    console.log($(window).width() + " " + $(window).height());
    $("#channels").width($(window).width());
    $("#channelUsers").height($(window).height());
    $("#nowPlaying").height($(window).height());
    $("#col2").height($(window).height());
    $("#col2").width($(window).width() - 500);
    $("#chatbox").width($(window).width() - 550);
    $("#chatbox").height($(window).height() - 150);
    $("#input").width($(window).width() - 540);
    if($(window).height() > 538)
        $("#centerAnchor").css("margin-top", ((($(window).height() / 2) - 254) + "px"));
}

function closeWindow()
{

}

function minimizeWindow()
{

}
