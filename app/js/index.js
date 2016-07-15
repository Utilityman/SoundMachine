'use strict';

function startup()
{
    loadUsers();
    loadChat();
    loadNowPlaying();
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
    console.log($(window).width());
    $("#channels").width($(window).width());
    $("#channelUsers").height($(window).height());
    /* TODO: someting css or javascript needs to be optimized for this one */$("#chatRoom").width($(window).width() - $("#nowPlaying").width() - $("#channelUsers").width() - 20);
    $("#col3").width($(window).width() - $("#nowPlaying").width() - $("#channelUsers").width());
}

function closeWindow()
{

}

function minimizeWindow()
{

}
