'use strict';

/* TODO: about:blank error
    from node_modules/jplayer/dist/jplayer/jquery.jplayer.js line 2957
    solution: delete line
    TODO next: Library colors, library sorts, add to library
    TODO: move the frame again
*/

// instead of console.loging, I call log which calls console.log but first checks this variable
const logging = true;
const SETTING_ELE_COUNT = 6;

var jsmediatags = require("jsmediatags");
var fs = require('fs');
var path = require('path');
var genreData = require('./data/genre.json');
//var songCatalogue = require("./data/manifest.json");

function SongData(path, type, name, album, artist)
{
    this.path = path;
    this.type = type;
    this.name = name;
    this.album = album;
    this.artist = artist;
}

// File System Variables
var collection = new Tree();

// Window Variables
var miniplayer = false;
var miniplayerElementIndex = 0;
var libraryMode = 'artist';

// Music Player

// Other Variables
var asyncCalls = 0;

/**
 *  Function that runs on startup. This function will load
 *  the music library that is found in the app/res/ directory.
 */
function startup()
{
    jukebox = new Jukebox();
    loadMusic(__dirname + "/res/");

    $("#library").css("display", "block");
    resizeWindow();
    loadLibrary();
}

/**
 *  Loads the music from the filesystem. Music is located in
 *  the app/res directory. Once the paths to the music files are
 *  read, then jsmediatags is called to read in title,album,artist
 *  details. When jsmediatags finishes, then setupLibraryPane() is called.
 *
 *  Note: currently isn't handling undefined albums/artists/titles
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
                asyncCalls++;
                (function(path)
                {
                    jsmediatags.read(path,
                    {
                        onSuccess: function(tag)
                        {
                            collection.addAll(tag.tags.artist,
                                              tag.tags.album,
                                              tag.tags.title,
                                              path);
                            asyncCalls--;
                            if(asyncCalls == 0)
                                setupLibraryPane();
                        },
                        onError: function(error)
                        {
                            console.log(':(', error.type, error.info);
                        },
                    });

                })(results[i]);
            }
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

/**
 *  Show functions adhere to the the libraryMode in what
 *  they hide and show with the three diferent modes being
 *      'artist': top-level elements. Clicking these
                  will show the albums that belong to that
                  artist. This is sortable and ommitable
        'album': second-level elements. Clicking these
                 will show the songs that belong to the album.
                 This is sortable and ommitable.
        'song':  third-level elements. Clicking these will
                 queue the song to the queue! These are sortable
                 but not ommitable
        TODO: Show only artists/songs (skip albums)

        This method is meant to show what one of the many
        show functions is supposed to look like. Each mode
        is mostly designed so that messing around with settings
        don't begin hiding or showing the wrong things. this way
        also helps facilitate better code in-that someone reading
        these modes can easily see which switches are flipping
        on and off.
 */
function showFunctions()
{
    return 'dont-call-me';
    if($("#this").hasClass('active'))
    {
        // Handle collapsing the current thing
        // No other external fields should change
        return;
    }
    if(libraryMode == 'song')
    {
        // If the mode is currently preferring the song,
        // albums and artist will be hidden and all that needs
        // to be done is to add the song to the playList
    }
    else if(libraryMode == 'album')
    {
        // If the mode is currently preferring the album,
        // only artists are hidden. Album mode need to handle
        // showing album contents and setting the albums
        // to be toggled as 'active'.
    }
    else if(libraryMode == 'artist')
    {
        // If the mode is currently preferring the artist,
        // everything is shown. Artist mode needs to handle
        // setting both albums and artists as active fields.
    }

}

/**
 *  This function gets called once all of the async jsmediatags finish.
 *  It utilizes the collection (which is a tree of all of the tracks)
 *  to create li's in the resourceTree for the user to interact with.
 *
 *  Since this is the callback function for when the collection is
 *  completely created, this function calls the createManifest function.
 */
function setupLibraryPane()
{
    // At this point, the async  process has called back...
    // so the collection can be written.
    createManifest();
    var splitRegex = /[\s|/|(|)|&|'|\[|\]|!]/;
    var baseList = $("#resourceTree");
    var artists = collection.getDepth(0);
    for(var i = 0; i < artists.length; i++)
    {
        // Created li element for artists:
        // <li id="<Artist_Name>" onclick="showArtists(this)">Artist Name</li>
        baseList.append('<li id="' + artists[i].split(splitRegex).join('_') +
                        '" class="artist' +
                        '" onclick="showAlbums(this)">'+artists[i]+'</li>');
        var albums = collection.get(artists[i], 1);
        for(var j = 0; j < albums.length; j++)
        {
        //Created li element for albums:
        // <li class="album hidden <Artist_Name>" id="<Album_Name>_<Artist_Name>"
        //                              onclick="showSongs(this)">Album Name</li>

            baseList.append('<li class="album hidden ' +
                            artists[i].split(splitRegex).join('_') +
                            '" id="' + albums[j].split(splitRegex).join('_') + "_" + artists[i].split(splitRegex).join('_') +
                            '" onclick="showSongs(this)">' +
                            albums[j] + '</li>');
            var songs = collection.getSongsSecure(artists[i], albums[j]);

            for(var k = 0; k < songs.length; k++)
            {
                // Created li element for songs:
                // <li id="<song_name>" class="song hidden <album_name>_<artist_name>"
                //                            onclick="addtoPlayList(this)">Song Name</li>
                baseList.append('<li id="' + songs[k].split(splitRegex).join('_') +
                                '" class="song hidden ' +
                                albums[j].split(splitRegex).join('_') + "_" + artists[i].split(splitRegex).join('_') +
                                '" onclick="addToPlaylist(this)">' +
                                songs[k] + '</li>');
            }
        }
    }

    $("#librarySettings").text("Library Options");
}

/**
 *  Artist onclick event. This shows the albums that belong to the artist
 */
function showAlbums(origin)
{
    if($(document.getElementById(origin.getAttribute('id'))).hasClass('active'))
    {
        $("#resourceTree .album").addClass('hidden');
        $("#resourceTree .song").addClass('hidden');
        $("#resourceTree .active").removeClass('active');
        return;
    }
    if(libraryMode == 'song')
    {
        // If an album is clicked somehow while in song preferring,
        // Make sure albums and artists are hidden...
        $("#resourceTree .album").addClass('hidden');
        $("#rsourceTree .artist").addClass('hidden');
    }
    else if(libraryMode == 'album')
    {
        // This again, shouldn't be called but in case it is,
        // Just hide all of the artists.
        $("#resourceTree .artist").addClass('hidden');
    }
    else if(libraryMode == 'artist')
    {
        $("#resourceTree .setting").addClass('hidden');
        $("#resourceTree .sort").addClass('hidden');
        $('#resourceTree .album').addClass('hidden');
        $("#resourceTree .song").addClass('hidden');

        $('#resourceTree .active').removeClass('active');
        $(document.getElementById(origin.getAttribute('id'))).addClass('active');
        $(document.getElementsByClassName(origin.getAttribute('id'))).removeClass('hidden');
    }

}

/**
 *  Album onclick event. This shows the songs belonging to album
 */
function showSongs(origin)
{
    if($(document.getElementById(origin.getAttribute('id'))).hasClass('active'))
    {
        $("#resourceTree .song").addClass('hidden');
        $(document.getElementById(origin.getAttribute('id'))).removeClass('active');
        return;
    }
    $("#resourceTree .song").addClass('hidden');
    $("#resourceTree .album.active").removeClass('active');
    $(document.getElementById(origin.getAttribute('id'))).addClass('active');
    $(document.getElementsByClassName(origin.getAttribute('id'))).removeClass('hidden');
}

function showSortSettings(origin)
{
    $("#resourceTree .sort").removeClass("hidden");
}

/**
 *  Sorts the music by the parameter and displays the sorted elements
 *  @param {sort} string - value to sort by
 *              album - sorts by album
 *              artist - sorts by artist
 *              song - sorts by songname
 */
function sortBy(sort)
{
    if(sort == 'album')
    {
        console.log($("#resourceTree"));
        $("#resourceTree .artist").addClass('hidden');
        var albums = $("#resourceTree .album");
        albums.removeClass('hidden');
        sortLi(albums);
        for(var i = albums.length - 1; i >= 0; i--)
        {
            $("#resourceTree li:eq(" + SETTING_ELE_COUNT + ")").after(albums[i]);
        }
        for(var i = 0; i < albums.length; i++)
        {
            var songs = $(document.getElementsByClassName(albums[i].id));
            for(var j = 0; j < 2; j++)
                $(albums[i]).after(songs[j]);
        }
        console.log($("#resourceTree"));
    }
}

// TODO: Switch to quicksort
function sortLi(elements)
{
    for(var i = 0; i < elements.length; i++)
    {
        //var min = elements[i];
        var replaceIndex = i;
        for(var j = i; j < elements.length; j++)
        {
            if(elements[replaceIndex].id > elements[j].id)
            {
                replaceIndex = j;
            }
        }

        var temp = elements[i];
        elements[i] = elements[replaceIndex];
        elements[replaceIndex] = temp;

    }
}

/**
 *  Song onlick event. This adds the clicked song to the playlist
 */
function addToPlaylist(origin)
{
    // Relies on the song name being in the text of the origin...
    // Might be safe to use most of the time?
    var collectionData = collection.get(origin.textContent, 3);
    if(!collectionData) return console.log("unexpected crazy error with " + origin.textcontent);
    console.log(collectionData);

    jukebox.insert(new SongData(collectionData[0],
        collectionData[0].substring(collectionData[0].length-3,
            collectionData[0].length),
            collectionData[3],
            collectionData[2],
            collectionData[1]));
}

function showSettings(origin)
{
    if($("#librarySettings").hasClass('active'))
    {
        $("#resourceTree .setting").addClass('hidden');
        $("#resourceTree .sort").addClass('hidden');
        $("#librarySettings").removeClass('active');
        return;
    }
    $("#resourceTree .active").removeClass('active');
    $("#resourceTree .album.active").removeClass('acitve');
    $("#librarySettings").addClass('active');
    $("#resourceTree .sort").addClass('hidden');
    $('#resourceTree .album').addClass('hidden');
    $("#resourceTree .song").addClass('hidden');

    // Show settings
    $("#resourceTree .setting").removeClass("hidden");
}

$(document).bind("mousedown", function(e)
{
    console.log("doink");
});
/**
 *  Iterates over songs[] immediately after the library
 *  is read in so that the complete library is included in
 *  the manifest.
 */
function createManifest()
{
    fs.writeFile("app/data/manifest.json", JSON.stringify(collection),
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
    $("#library").height($(window).height() - 60);
    $("#input").width($(window).width() - 540);
    $("#playListScroll").height($(window).height() - 500);
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
    channelInfo.css("padding", "4px 8px");
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
