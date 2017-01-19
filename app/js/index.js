'use strict';

/*
 *  This file is essentially the main of the rendering process.
 */

let SETTING_ELE_COUNT = 0;

// Electron and Config Stuffs
let {ipcRenderer} = require('electron');
let config = require(__dirname + '/data/config.json');

// Music Stuffs
let jsmediatags = require("jsmediatags");
let genreData = require(__dirname + '/data/genre.json');

$.fn.classList = function() {return this[0].className.split(/\s+/);};

// Collections
let collection = new Tree();
let miniCollection = new Tree();
let connectedCollections = [];

// Window letiables
let miniplayer = false;
let miniplayerElementIndex = 0;
let col1Width = 350;

// Other letiables
let setup = false;
let asyncCalls = 0;
let asyncCallsToDo = 0;
let contextTarget = null;

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
    $.notify.defaults(
    {
        className: "info",
        autoHideDelay:1500,
    });
    $.notify.addStyle('metadata',
    {
        html:
        "<div class='dont-close'>" +
            "<div class='clearfix dont-close'>" +
                "<div class='input dont-close'>" +
                    "<label class='dont-close' onclick='submitMetadata()'>" +
                    "&check;</label>" +
                    "<input class='dont-close metadataEntry' type='text'>" +
                "</div>" +
        "</div>"
    });
});

$(document).bind("mousedown", function(e)
{
    // TODO: get rid of hasClass 'contextMenu' in favor of the aptly named dont-close
    if(e.which == 1 && !($(e.target).hasClass('contextMenu')) &&
            !($(e.target).hasClass('dont-close')))
    {
        console.log('BLAM!');
        $('.contextContents').addClass('hidden');
        $('.selected').removeClass('selected');
        $('.notifyjs-wrapper').trigger('notify-hide');

    }
    // if its a right click we can still hide the notifications
    if(e.which == 3)
    {
        $('.notifyjs-wrapper').trigger('notify-hide');
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
/*function connect()
{

}*/

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
    $("#col2").width($(window).width() - col1Width);
    $("#chatbox").width($(window).width() - 550);
    $("#chatbox").height($(window).height() - 150);
    $("#library").height($(window).height() - 60);
    $('#settings').height($(window).height() - 60);
    $("#input").width($(window).width() - 540);
    $('#playListPanel').height($(window).height() - 502);
    $("#playListScroll").height($(window).height() - 502);
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

/* TODO: Work on the miniplayer CSS*/
function convertToMiniplayer()
{
    //let channelInfo = $(".channel.active span");
    //channelInfo.css("height", "28px");
    //channelInfo.css("background", "gray");
    //channelInfo.css("max-width", "100%");
    //channelInfo.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
    //function() {
    //    channelInfo.parent().css("margin-right", channelInfo.width() + 16);
    //});
}

function convertFromMiniplayer()
{
    //$(".channel.active").children().css("padding", "0");
    //$(".channel.active").children().css("max-width", "0");
    //$(".channel.active").css("margin-right", 0);
}

/**
 * shuffle method taken from: https://bost.ocks.org/mike/shuffle/
 */
function shuffle(array)
{
    let m = array.length, t, i;

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

ipcRenderer.on('unfocus', (event, args) =>
{
    $('.contextContents').addClass('hidden');
});
