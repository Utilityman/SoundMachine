'use strict';

const SKIP_DEPLAY = 3;

var jsmediatags = require("jsmediatags");
var fs = require('fs');
var path = require('path');
var genreData = require('./data/genre.json');
var songCatalogue = require("./data/manifest.json");

function SongData(path, type)
{
    this.path = path;
    this.type = type;
}

// File System Variables
var collection = new Tree();

// Window Variables
var miniplayer = false;
var miniplayerElementIndex = 0;

// Music Player Variables
var autoplay = false;
var repeat = false;
var songs = [];
var priorSongs = [];

// Other Variables
var asyncCalls = 0;

/**
 *  Function that runs on startup. This function will load
 *  the music library that is found in the app/res/ directory.
 */
function startup()
{
    loadMusic(__dirname + "/res/");

    $("#library").css("display", "block");
    loadLibrary();
}

/**
 *  Loads the music from the filesystem. Music is located in
 *  the app/res directory.
 */
function loadMusic(dir)
{
    var walk = function(dir, done)
    {
      var results = [];
      fs.readdir(dir, function(err, list)
      {
        if (err) return done(err);
        var i = 0;
        (function next()
        {
          var file = list[i++];
          if (!file) return done(null, results);
          file = path.resolve(dir, file);
          fs.stat(file, function(err, stat)
          {
            if (stat && stat.isDirectory())
            {
              walk(file, function(err, res)
              {
                results = results.concat(res);
                next();
              });
            }
            else
            {
              results.push(file);
              next();
            }
          });
        })();
      });
    };
    walk(dir, function(err, results)
    {
        if (err) throw err;
        for(var i = 0; i < results.length; i++)
        {
            var type = results[i].substring(results[i].length-3, results[i].length);
            if(type == 'mp3' || type == 'm4a')
            {
                var path  = results[i];
                songs.push(new SongData(path, type));
                asyncCalls++;
                jsmediatags.read(path,
                {
                    onSuccess: function(tag)
                    {
                        collection.addAll(tag.tags.artist, tag.tags.album, tag.tags.title);

                        asyncCalls--;
                        if(asyncCalls == 0)
                            setupLibraryPane();
                    },
                    onError: function(error)
                    {
                        console.log(':(', error.type, error.info);
                    },
                });
            }
        }
        if(songs.length > 0)
        {
            createManifest();
            shuffle(songs);
            initSong(songs[0]);
        }
    });
}

/**
 *  This function will attempt to connect to a SoundMachine
 *  application that is broadcasting its music.
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

function setupLibraryPane()
{
    collection.log();
}

$(document).bind("mousedown", function(e)
{
    console.log("hey");
});
/**
 *  Iterates over songs[] immediately after the library
 *  is read in so that the complete library is included in
 *  the manifest.
 */
function createManifest()
{
    fs.writeFile("app/data/manifest.json", JSON.stringify(songs),
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

/**
 *  Initializes a song object
 *  Songs have paths, and types
 */
function initSong(song)
{
    if(!song) return;
    jsmediatags.read(song.path,
    {
        onSuccess: function(tag)
        {
            console.log(tag);
            $("#songArtistAlbum").text(tag.tags.title + ", " + tag.tags.artist + " on " + tag.tags.album);
            $(".channel.active").children().text(tag.tags.title + " by " + tag.tags.artist);
            getCoverArt(tag);
        },
        onError: function(error)
        {
            console.log(':(', error.type, error.info);
        },
    });
    if(song.type == 'mp3')
        initMP3(song)
    else if(song.type =='m4a')
        initM4A(song);
}

/**
 *  Gets the cover art and puts it in #coverArt
 *  Also handles cases where the cover art doesn't exist
 */
function getCoverArt(tag)
{
    var image = tag.tags.picture;
    /* If the image exists, create the base64 image from the data and display it*/
    if(image)
    {
        var base64String = "";
        for(var i = 0; i < image.data.length; i++)
        {
            base64String += String.fromCharCode(image.data[i]);
        }
        var base64 = "data:" + image.format + ";base64," + window.btoa(base64String);
        changeArt(base64);
        //return base64;
    }
    else /* This handles when the image data isn't available*/
    {
        var genreName = "none";
        if(tag.tags.genre)
        {
            genreName = tag.tags.genre;
        }
        else if(tag.tags.gnre)
        {
            if(genreData[tag.tags.gnre.data])
            {
                genreName = genreData[tag.tags.gnre.data];
            }
        }
        if(genreName == 'ROCK')
            changeArt("imgs/cover_art/rockCoverArt.png");
        else if(genreName != 'none')
        {
            console.log("unhandled genre without art: " + genreName);
            changeArt("imgs/cover_art/unknownArt.jpg");
        }
        else
            changeArt("imgs/cover_art/unknownArt.jpg");
    }
}

/**
 *  Changes which image is active/inactive which fades in the new image
 *  TODO: Gotta fix it
 */
function changeArt(src)
{
    var activeImage = $(".coverArt.active");
    //var inactiveImage = $(".coverArt.inactive");
    //console.log(activeImage.attr("src") + " " + inactiveImage.attr("src"));
    activeImage.attr("src", src);
    //inactiveImage.removeClass("inactive");
    //inactiveImage.addClass("active");
    //activeImage.removeClass("active");
    //activeImage.addClass("inactive");
}

function initMP3(song)
{
    $("#jquery_jplayer_1").jPlayer({
        ready: function()
        {
            $(this).jPlayer("setMedia",
            {
                mp3: song.path,
            });

            if(autoplay)
                $(this).jPlayer("play");
        },
        play: function()
        {
            autoplay = true;
        },
        ended: function()
        {
            nextSong();
        },
        cssSelectorAncestor: "#jp_container_1",
        swfPath: "/js",
        supplied: "mp3",
        useStateClassSkin: true,
        autoBlur: false,
        smoothPlayBar: true,
        keyEnabled: true,
        remainingDuration: true,
        toggleDuration: true,
    });
}

function initM4A(song)
{
    $("#jquery_jplayer_1").jPlayer({
        ready: function()
        {
            repeat = false;
            $(this).jPlayer("setMedia",
            {
                m4a: song.path,
            });
            if(autoplay)
                $(this).jPlayer("play");

        },
        play: function()
        {
            autoplay = true;
        },
        ended: function()
        {
            nextSong();
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
    $("#input").width($(window).width() - 540);
    if($(window).height() > 532)
        $("#centerAnchor").css("margin-top", ((($(window).height() / 2) - 254) + "px"));
    if($(window).height() == 28)
    {
        miniplayer = true;
        var channelInfo = $(".channel.active span");
        channelInfo.css("padding", "4px 8px");
        channelInfo.css("background", "gray");
        channelInfo.css("max-width", "100%");
        channelInfo.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
        function() {
            channelInfo.parent().css("margin-right", channelInfo.width() + 16);
        });
    }
    else if(miniplayer)
    {
        $(".channel.active").children().css("padding", "0");
        $(".channel.active").children().css("max-width", "0");
        $(".channel.active").css("margin-right", 0);
    }
}

function closeWindow()
{

}

function minimizeWindow()
{

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

function nextSong()
{
    if(songs.length > 0)
    {
        $("#jquery_jplayer_1").jPlayer("destroy");
        if(!repeat)
        {
            priorSongs.push(songs.shift());
        }
            initSong(songs[0]);
    }
}

function prevSong()
{
    if($("#jquery_jplayer_1").data("jPlayer") && $("#jquery_jplayer_1").data("jPlayer").status.currentTime > SKIP_DEPLAY)
    {
        $("#jquery_jplayer_1").jPlayer("destroy");

        if(songs.length > 0)
            initSong(songs[0]);
    }
    else
    {
        $("#jquery_jplayer_1").jPlayer("destroy");
        if(priorSongs.length > 0)
        {
            songs.unshift(priorSongs.pop());
        }

        if(songs.length > 0)
            initSong(songs[0]);
    }
}

function toggleRepeat()
{
    repeat = !repeat;
    console.log("repeat: " + repeat);
}

function toggleAutoPlay()
{
    autoplay = !autoplay;
}
