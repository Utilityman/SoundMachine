'use strict';

/*
 *  This file is essentially the main of the rendering process.
 */

var SETTING_ELE_COUNT = 0;

// Basic Node and Electron stuffs
var {ipcRenderer} = require('electron');

// Music Stuffs
var jsmediatags = require("jsmediatags");
var genreData = require(__dirname + '/data/genre.json');

// Collections
var collection = new Tree();
var miniCollection = new Tree();

// Window Variables
var miniplayer = false;
var miniplayerElementIndex = 0;

// Other Variables
var setup = false;
var asyncCalls = 0;
var asyncCallsToDo = 0;
var contextTarget = null;


$(document).ready(function()
{
    SETTING_ELE_COUNT = $('#resourceTree').children().length;

    $('#roomName').change(function()
    {
        console.log($('#roomName').val());
        $("#your-channel").text($("#roomName").val());
    });

    // Switch channels
    $(".channel").mousedown(function(event)
    {
        if(event.which == 3)
        {
            alert("Right Click - channel options");
        }
        if(event.which == 1)
        {
            alert("Left Click - Change Channel")
        }
    });


});

$(document).bind("mousedown", function(e)
{
    if(e.which == 1 && !($(e.target).hasClass('contextMenu')))
    {
        console.log('BLAM!');
        $('.contextContents').addClass('hidden');
        $('.selected').removeClass('selected');
    }
});

/**
 *  Function that runs on startup. This function will load
 *  the music library that is found in the app/res/ directory.
 */
function startup()
{
    jukebox = new Jukebox();
    loadFromManifest();
    $("#library").css("display", "block");
    resizeWindow();
}

/**
 *  Connect and Load functions will be for when you connect to another channel
 */
function connect()
{

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

function loadLibrary()
{

}

/**
 *  Iterates over songs[] immediately after the library
 *  is read in so that the complete library is included in
 *  the manifest.
 */
function createManifest()
{
    fs.writeFile(__dirname + "/data/manifest.json", JSON.stringify(collection),
        function(err)
        {
            if(err) console.log("error writing manifest.json");
        });
}

/**
 *  Opens a tab selected from the tab menu
 */
function openTab(ele, tabName)
{
    $(".tabcontent").css("display", "none");
    $(".tablinks").removeClass("active");
    $("#"+tabName).css("display", "block");
    $(ele).addClass("active");
}

function addChannel()
{
    alert("Which Channel To Add?");
}

/**
 *  Appropriately manages the resizing of the window.
 *  This function will also convert the player into the miniplayer
 *  when resized to the minimum height
 */
function resizeWindow()
{
    //console.log($(window).width() + " " + $(window).height());
    $("#channelUsers").height($(window).height());
    $("#nowPlaying").height($(window).height());
    $("#col2").height($(window).height());
    $("#col2").width($(window).width() - 500);
    $("#chatbox").width($(window).width() - 550);
    $("#chatbox").height($(window).height() - 150);
    $("#library").height($(window).height() - 60);
    $("#input").width($(window).width() - 540);
    $('#playListPanel').height($(window).height() - 490);
    $("#playListScroll").height($(window).height() - 490);
    $("#libraryScroll").height($(window).height() - 60);

    if($(window).height() == 28)
    {
        miniplayer = true;
        convertToMiniplayer();
    }
    else if(miniplayer)
    {
        miniplayer = false;
        convertFromMiniplayer();
    }
}

/* TODO: Work on the miniplayer*/
function convertToMiniplayer()
{
    var channelInfo = $(".channel.active span");
    channelInfo.css("height", "28px");
    channelInfo.css("background", "gray");
    channelInfo.css("max-width", "100%");
    channelInfo.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
    function() {
        channelInfo.parent().css("margin-right", channelInfo.width() + 16);
    });
}

function convertFromMiniplayer()
{
    $(".channel.active").children().css("padding", "0");
    $(".channel.active").children().css("max-width", "0");
    $(".channel.active").css("margin-right", 0);
}

/**
 * shuffle method taken from: https://bost.ocks.org/mike/shuffle/
 */
function shuffle(array)
{
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);
    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    }
    return array;
}

function closeWindow()
{
    ipcRenderer.send('quit', '');
}

function minimizeWindow()
{
    ipcRenderer.send('minimize', '');
}

function toggleOntop()
{
    ipcRenderer.send('toggleTop', '');
}

function toggleWebTools()
{
    ipcRenderer.send('toggleTools', '');
}

function toggleWindow()
{
    ipcRenderer.send('toggleWindow', 'finished-loading');
}

function sendProgress(current)
{
    ipcRenderer.send('loading', current);
}

function toggleAlwaysShuffle()
{
    alwaysShuffle = !alwaysShuffle;
}

function setArt(mode)
{
    jukebox.setArt(mode);
}
