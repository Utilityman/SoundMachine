
/**
 *  This file contains the functions and variables for
 *  the library pane.
 *
 *  A few of these functions are shared with the
 *  Playlists tab
 */


 var fs = require('fs');
 var path = require('path');

 var ytdl = require('ytdl-core');

 var libraryMode = 'artist';
 var hideAlbums = false;
 var alwaysShuffle = true;


$(document).ready(function()
{

    $('#uploadFile').change(function()
    {
        $('#selectFiles').addClass('hidden');
        $('#addFiles').removeClass('hidden');
    });
    $('#uploadDirectory').change(function()
    {
        $('#selectDirectory').addClass('hidden');
        $('#addDirectory').removeClass('hidden');
    });
    $('#youtubeUpload').change(function()
    {
        console.log($('#youtubeUpload').val());
        $('#youtubeUpload').prop('disabled', true);
        $('#youtubeUpload').css('color','#666666');
        streamFromYoutube($('#youtubeUpload').val());
    });
});

/**
 *  This function gets called from the startup()
 *  function during the startup process to load
 *  the entire library from the manifest.
 */
function loadFromManifest()
{
    var manifest;
    fs.stat(__dirname + "/data/manifest.json", function(err, stat)
    {
        if(err == null)
        {
            manifest = require(__dirname + "/data/manifest.json");
        }
        else if(err.code == 'ENOENT')
        {
            manifest = {};
        }
        else
            console.log('strange error reading manifest.json');

        if (manifest.branches && manifest.branches.length != 0)
        {
            for(var i = 0; i < manifest.branches.length; i++)
                    for(var j = 0; j < manifest.branches[i].branches.length; j++)
                        for(var k = 0; k < manifest.branches[i].branches[j].branches.length; k++)
                            loadFile(manifest.branches[i].branches[j].branches[k].branches[0].item,
                                manifest.branches[i].item,
                                manifest.branches[i].branches[j].item,
                                manifest.branches[i].branches[j].branches[k].item);
        }
        else if(!setup)
        {
            setupLibraryPane();
        }
    });
}

function loadFile(param, artist, album, song)
{
    var lastIndex = param.lastIndexOf('.');
    if(lastIndex == -1) return "invalid file";
    var type = param.substring(lastIndex+1, param.length);

    // Make sure the path is an accepted type
    if(type == 'mp3' || type == 'm4a' || type == 'webm')
    {
        asyncCalls++;
        // this self executing function handles the async process of adding songs to the library.
        (function(path, ext, album, artist, song)
        {
            // if everything was given to the method then we don't
            // need to read for metadata, just use the given data
            // (this case happens when reading from manifest)
            if(typeof album !== 'undefined' &&
               typeof artist !== 'undefined' &&
               typeof song !== 'undefined')
            {
                setTimeout(function() { loadFileWrapUp(artist, album, song, path);}, 1000);
                //loadFileWrapUp(artist, album, song, path);
            }
            else
            {
                jsmediatags.read(path,
                {
                    onSuccess: function(tag)
                    {
                        loadFileWrapUp(tag.tags.artist,
                                          tag.tags.album,
                                          tag.tags.title,
                                          path);
                    },
                    onError: function(err)
                    {
                        console.log('oops:', err.type, err.info);
                    },
                });
            }
        })(param, type, album, artist, song);
    }
}

function loadFileWrapUp(artist, album, title, path)
{
    collection.addAll(artist, album, title, path);
    asyncCalls--;
    asyncCallsToDo--;
    if(asyncCalls == 0 && !setup)
    {
        setupLibraryPane();
    }
    else if(setup)
    {
        miniCollection.addAll(artist, album, title, path);

        if(asyncCallsToDo == 0)
            appendToLibraryPane(miniCollection);
    }

    if(!setup)
        sendProgress(asyncCalls);
}

function addYoutubeFileToCollection(youtube, title, path)
{
    collection.addAll(youtube,
                      youtube,
                      title,
                      path);
    miniCollection.addAll(youtube,
                        youtube,
                        title,
                        path);
    appendToLibraryPane(miniCollection);
}

/**
 *  This function gets called once all of the ffmetadata calls finish.
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
        // <li id="<Artist_Name>" class='artist' onclick="showArtists(this)">Artist Name</li>
        baseList.append('<li id="' + artists[i].split(splitRegex).join('_') +
                        '" class="artist' +
                        '" onclick="showAlbums(this)">'+ artists[i] + '</li>');
        $('#'+artists[i].split(splitRegex).join('_')).mousedown(function(event)
        {
            artistContextEvent(event);
        });
        var albums = collection.get(artists[i], 1);
        for(var j = 0; j < albums.length; j++)
        {
        //Created li element for albums:
        // <li class="album hidden <Artist_Name>" id="<Album_Name>_<Artist_Name>"
        //                              onclick="showSongs(this)">Album Name</li>

            baseList.append('<li class="album hidden ' +
                            artists[i].split(splitRegex).join('_') +
                            '" id="' + albums[j].split(splitRegex).join('_') + "_" +
                            artists[i].split(splitRegex).join('_') +
                            '" onclick="showSongs(this)">' +
                            albums[j] + '</li>');
            $(document.getElementById(albums[j].split(splitRegex).join('_') + "_" +
                  artists[i].split(splitRegex).join('_'))).mousedown(function(event)
            {
                albumContextEvent(event);
            });
            var songs = collection.getSongsSecure(artists[i], albums[j]);

            for(var k = 0; k < songs.length; k++)
            {
                // Created li element for songs:
                // <li id="<song_name>" class="song hidden <album_name>_<artist_name>"
                //                            onclick="addToPlaylist(this)">Song Name</li>
                baseList.append('<li id="' + songs[k].split(splitRegex).join('_') +
                                '" class="song hidden ' +
                                albums[j].split(splitRegex).join('_') + "_" +
                                artists[i].split(splitRegex).join('_') +
                                '" onclick="addToPlaylist(this)">' +
                                songs[k] + '</li>');
                $(document.getElementById(songs[k].split(splitRegex).join('_'))).mousedown(function(event)
                {
                    songContextEvent(event);
                });
            }
        }
    }

    $("#librarySettings").text("Library Options");
    sortBy(libraryMode);
    toggleWindow();
    console.log('setup!');
    setup = true;
}

/**
 *  Like setupLibraryPane() but instead appends to it.
 */
function appendToLibraryPane(miniCollection)
{
    createManifest();

    var splitRegex = /[\s|/|(|)|&|'|\[|\]|!]/;
    var baseList = $("#resourceTree");
    var artistList = $('#resourceTree .artist');
    var albumList = $('#resourceTree .album');
    var titles = $('#resourceTree .song');

    var found = false;
    var newArtists = miniCollection.getDepth(0);

    // This is a mess but it works, if ever reading through - read carefully
    // Essentially this goes through each level of the miniColl
    for(var j = 0; j < newArtists.length; j++)
    {
        found = false;
        for(var i = 0; i < artistList.length; i++)
            if(artistList[i].innerHTML == newArtists[j])
                found = true;
        if(!found)
        {
            baseList.append('<li id="' + newArtists[j].split(splitRegex).join('_') +
                            '" class="artist' +
                            '" onclick="showAlbums(this)">'+newArtists[j]+'</li>');
            $('#'+newArtists[j].split(splitRegex).join('_')).mousedown(function(event)
            {
                artistContextEvent(event);
            });
        }

        var newAlbums = miniCollection.get(newArtists[j], 1);
        for(var k = 0; k < newAlbums.length; k++)
        {
            found = false;
            for(var i = 0; i < albumList.length; i++)
                if(albumList[i].innerHTML == newAlbums[k])
                    found = true;
            if(!found)
            {
                baseList.append('<li class="album hidden ' +
                                newArtists[j].split(splitRegex).join('_') +
                                '" id="' + newAlbums[k].split(splitRegex).join('_') + "_" + newArtists[j].split(splitRegex).join('_') +
                                '" onclick="showSongs(this)">' +
                                newAlbums[k] + '</li>');
                $(document.getElementById(newAlbums[k].split(splitRegex).join('_') + "_" + newArtists[j].split(splitRegex).join('_')))
                    .mousedown(function(event)
                    {
                        albumContextEvent(event);
                    });
            }
            var newSongs = miniCollection.getSongsSecure(newArtists[j], newAlbums[k]);
            for(var a = 0; a < newSongs.length; a++)
            {
                found = false;
                for(var i = 0; i < titles.length; i++)
                    if(titles[i].innerHTML == newSongs[a])
                        found = true;
                if(!found)
                {
                    baseList.append('<li id="' + newSongs[a].split(splitRegex).join('_') +
                                    '" class="song hidden ' +
                                    newAlbums[k].split(splitRegex).join('_') + "_" + newArtists[j].split(splitRegex).join('_') +
                                    '" onclick="addToPlaylist(this)">' +
                                    newSongs[a] + '</li>');
                    $(document.getElementById(newSongs[a].split(splitRegex).join('_'))).mousedown(function(event)
                    {
                        songContextEvent(event);
                    });
                }
            }
        }
    }

    miniCollection = new Tree();
    sortBy(libraryMode);
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
    //$('#librarySettings').removeClass('active');
    $('#resourceTree #sortBy').removeClass('active');
    //$('.setting').addClass('hidden');
    $('.sort').addClass('hidden');
    $('.addAll').addClass('hidden');
    //$('.external').addClass('hidden');
    if(sort == 'album')
    {
        $('#hideAlbums').prop('disabled', true);
        libraryMode = 'album';
        $("#resourceTree .artist").addClass('hidden');
        $('#resourceTree .song').addClass('hidden');
        $('#resourceTree .album').removeClass('active');
        var albums = $("#resourceTree .album");
        albums.removeClass('hidden');
        sortLi(albums);
        for(var i = albums.length - 1; i >= 0; i--)
            $("#resourceTree li:eq(" + SETTING_ELE_COUNT + ")").after(albums[i]);
        for(var i = 0; i < albums.length; i++)
        {
            var songs = $(document.getElementsByClassName(albums[i].id));
            for(var j = 0; j < songs.length; j++)
                $(albums[i]).after(songs[j]);
        }
        return;
    }
    else if(sort == 'song')
    {
        $('#hideAlbums').prop('disabled', false);
        libraryMode = 'song';
        $("#resourceTree .artist").addClass('hidden');
        $('#resourceTree .album').addClass('hidden');
        var songs = $("#resourceTree .song");
        songs.removeClass('hidden');
        sortLi(songs);
        for(var i = songs.length - 1; i >= 0; i--)
            $("#resourceTree li:eq(" + SETTING_ELE_COUNT + ")").after(songs[i]);
        return;
    }
    else if(sort == 'artist')
    {
        $('#hideAlbums').prop('disabled', false);
        libraryMode = 'artist';
        $('#resourceTree .album').addClass('hidden');
        $('#resourceTree .song').addClass('hidden');

        var artists = $("#resourceTree .artist");
        artists.removeClass('hidden');
        sortLi(artists);
        for(var i = artists.length - 1; i >= 0; i--)
            $("#resourceTree li:eq(" + SETTING_ELE_COUNT + ")").after(artists[i]);
        for(var i = 0; i < artists.length; i++)
        {
            var albums = $(document.getElementsByClassName(artists[i].id));
            for(var j = 0; j < albums.length; j++)
            {
                $(artists[i]).after(albums[j]);
                var songs = $(document.getElementsByClassName(albums[j].id));
                for(var k = 0; k < songs.length; k++)
                    $(albums[j]).after(songs[k]);
            }
        }
        return;
    }
}

// TODO: Switch to quicksort
function sortLi(elements)
{
    var splitRegex = /The_/;

    for(var i = 0; i < elements.length; i++)
    {
        //var min = elements[i];
        var replaceIndex = i;
        for(var j = i; j < elements.length; j++)
        {
            if(elements[replaceIndex].id.split(splitRegex).join('') > elements[j].id.split(splitRegex).join(''))
                replaceIndex = j;
        }

        var temp = elements[i];
        elements[i] = elements[replaceIndex];
        elements[replaceIndex] = temp;

    }
}

/////////////////////////////////////////////////////
/*//////////// BEGIN SHOW FUNCTIONS ///////////////*/
/////////////////////////////////////////////////////

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
        //$('#resourceTree .external').addClass('hidden');
        //$("#resourceTree .setting").addClass('hidden');
        //$("#resourceTree .sort").addClass('hidden');
        $('#resourceTree .album').addClass('hidden');
        $("#resourceTree .song").addClass('hidden');
        $('#resourceTree .active').removeClass('active');
        $(document.getElementById(origin.getAttribute('id'))).addClass('active');


        if(!hideAlbums)
            $(document.getElementsByClassName(origin.getAttribute('id'))).removeClass('hidden');
        else if(hideAlbums)
        {
            var albums = $(document.getElementsByClassName(origin.getAttribute('id')));
            for(var i = 0; i < albums.length; i++)
            {
                showSongs(albums[i]);
            }
        }
    }
    $('#artistMenu').addClass('hidden');
}

function showSettings(origin)
{
    if($("#librarySettings").hasClass('active'))
    {
        $("#resourceTree .setting").addClass('hidden');
        $("#resourceTree .sort").addClass('hidden');
        $('#resourceTree .external').addClass('hidden');
        $('#resourceTree .addAll').addClass('hidden');
        $("#librarySettings").removeClass('active');
        return;
    }
    else if(libraryMode == 'artist')
    {
        $("#resourceTree .active").removeClass('active');
        $("#resourceTree .album.active").removeClass('acitve');
        $("#resourceTree .sort").addClass('hidden');
        $('#resourceTree .album').addClass('hidden');
        $("#resourceTree .song").addClass('hidden');
    }
    else if(libraryMode == 'album')
    {
        $("#resourceTree .active").removeClass('active');
        $("#resourceTree .album.active").removeClass('acitve');
        $("#resourceTree .sort").addClass('hidden');
        $("#resourceTree .song").addClass('hidden');
    }

    // Show settings
    $("#librarySettings").addClass('active');
    $("#resourceTree .setting").removeClass("hidden");
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
    if(!hideAlbums || libraryMode == 'album')
        $("#resourceTree .song").addClass('hidden');
    $("#resourceTree .album.active").removeClass('active');
    $(document.getElementById(origin.getAttribute('id'))).addClass('active');
    $(document.getElementsByClassName(origin.getAttribute('id'))).removeClass('hidden');
    $('#albumMenu').addClass('hidden');
}

function showSortSettings(origin)
{
    $('#resourceTree .addAll').addClass('hidden');
    $('#resourceTree #addAll').removeClass('active');
    $('#resourceTree .external').addClass('hidden');
    $('#resourceTree #externalOptions').removeClass('active');
    if($('#resourceTree #sortBy').hasClass('active'))
    {
        $('#resourceTree #sortBy').removeClass('active');
        $('#resourceTree .sort').addClass('hidden');
        return;
    }
    $('#resourceTree #sortBy').addClass('active');
    $("#resourceTree .sort").removeClass("hidden");
}

function showAddAllOptions()
{
    $('#resourceTree .external').addClass('hidden');
    $('#resourceTree .sort').addClass('hidden');
    $('#resourceTree #exernalOptions').removeClass('active');
    $('#resourceTree #sortBy').removeClass('active');
    if($('#resourceTree #addAll').hasClass('active'))
    {
        $('#resourceTree #addAll').removeClass('active');
        $('#resourceTree .addAll').addClass('hidden');
        return;
    }
    $('#resourceTree #addAll').addClass('active');
    $('#resourceTree .addAll').removeClass('hidden');
}

function showExternalOptions()
{
    $('#resourceTree .addAll').addClass('hidden');
    $('#resourceTree #addAll').removeClass('active');
    $('#resourceTree #sortBy').removeClass('active');
    $('#resourceTree .sort').addClass('hidden');
    if($('#resourceTree #externalOptions').hasClass('active'))
    {
        $('#resourceTree #externalOptions').removeClass('active');
        $('#resourceTree .external').addClass('hidden');
        return;
    }
    $('#resourceTree #externalOptions').addClass('active');
    $("#resourceTree .external").removeClass("hidden");
}

/**
 *  Song onlick event. This adds the clicked song to the playlist
 *  Also can simply be called if you find the song DOM element
 */
function addToPlaylist(origin)
{
    // Relies on the song name being in the text of the origin...
    // Might be safe to use most of the time?
    var collectionData = collection.get(origin.textContent, 3);
    if(!collectionData) return console.log("unexpected crazy error with " + origin.textcontent);

    jukebox.insert(new SongData(collectionData[0],
        collectionData[0].substring(collectionData[0].length-3,
            collectionData[0].length),
            collectionData[3],
            collectionData[2],
            collectionData[1]));
}
/////////////////////////////////////////////////////
/*////////////// END SHOW FUNCTIONS ///////////////*/
/////////////////////////////////////////////////////

function modifyMetaData()
{
    $('#metadata').text('Coming Soon!');
}

function removeTarget(source)
{
    $(source).text('Coming Soon!');
}

function addArtistToPlaylist()
{

}

function addAlbumtoPlaylist()
{

}

function addSongToPlaylist()
{

}

// test: https://www.youtube.com/watch?v=R20f-TPKjzc
function streamFromYoutube(yourl)
{
    if(yourl.indexOf('youtube.com') !== -1)
    {
        $('#youtubeUpload').val('Downloading...');
        ytdl.getInfo(yourl, function(err, info)
        {
            if(err){youtubeError(err); return; }
            var stream = ytdl(yourl, { filter: function(format) {return format.container === 'webm'} })
                            .pipe(fs.createWriteStream(__dirname + '/data/downloads/' + info.title + '.webm'))
                            .on('finish', function()
                            {
                                //console.log('done!');
                                addYoutubeFileToCollection('Youtube', info.title, __dirname + '/data/downloads/' + info.title + '.webm');
                                $('#youtubeUpload').prop('disabled', false);
                                $('#youtubeUpload').css('color','black');
                                $('#youtubeUpload').val('Download Success!');
                                //$('.external').addClass('hidden');
                            });
        });
    }
    else
    {
        $('#youtubeUpload').val('Searching...');
        /*yourl = 'https://www.youtube.com/results?q=' + yourl.split(" ").join('+');
        $.ajax({
            url: yourl,
            type: 'POST',
            success: function(resp)
            {
                //console.log(resp);
            },
            error: function(er)
            {
                console.log('ERROR');
                //console.log(er);
            }

        });*/
        $('#youtubeUpload').prop('disabled', false);
        $('#youtubeUpload').css('color','black');
        $('#youtubeUpload').val('Search Not Implemented Yet!');
    }
}

function youtubeError(err)
{
    $('#youtubeUpload').val('Download Failed!');
    $('#youtubeUpload').prop('disabled', false);
    $('#youtubeUpload').css('color','black');
}

/**
 *  gets called from context menus after this song discovery process
 */
function addToFront(origin)
{
    var collectionData = collection.get(origin.textContent, 3);
    if(!collectionData) return console.log("unexpected crazy error with " + origin.textcontent);

    jukebox.insertToFront(new SongData(collectionData[0],
        collectionData[0].substring(collectionData[0].length-3,
            collectionData[0].length),
            collectionData[3],
            collectionData[2],
            collectionData[1]));
}

function addAll(mode)
{
    if(mode == 'album')
    {
        var albums = $("#resourceTree .album");
        sortLi(albums);
        for(var i = 0; i < albums.length; i++)
        {
            var songs = $(document.getElementsByClassName(albums[i].id));
            for(var j = 0; j < songs.length; j++)
                addToPlaylist(songs[j]);
        }
        return;
    }
    else if(mode == 'song')
    {
        var songs = $("#resourceTree .song");
        sortLi(songs);
        for(var j = 0; j < songs.length; j++)
            addToPlaylist(songs[j]);
        return;
    }
    else if(mode == 'artist')
    {
        var artists = $("#resourceTree .artist");
        sortLi(artists);

        for(var i = 0; i < artists.length; i++)
        {
            var albums = $(document.getElementsByClassName(artists[i].id));
            for(var j = 0; j < albums.length; j++)
            {
                var songs = $(document.getElementsByClassName(albums[j].id));

                for(var k = 0; k < songs.length; k++)
                    addToPlaylist(songs[k]);

            }
        }
        return;
    }
    else if(mode == 'shuffle')
    {
        var songs = $("#resourceTree .song");
        shuffle(songs);
        shuffle(songs);
        for(var j = 0; j < songs.length; j++)
            addToPlaylist(songs[j]);
        return;
    }
}

function addUpload()
{
    $('#selectFiles').removeClass('hidden');
    $('#addFiles').addClass('hidden');
    //$('#externalOptions').removeClass('active');
    //$('.external').addClass('hidden');
    var upload = $("#uploadFile");
    asyncCallsToDo = upload[0].files.length;
    for(var i = 0; i < upload[0].files.length; i++)
    {
        loadFile(upload[0].files[i].path);
    }

    $('#uploadFile').val('');
}

function addDirectory()
{
    $('#addDirectory').addClass('hidden');
    $('#selectDirectory').removeClass('hidden');
    //$('#externalOptions').removeClass('active');
    //$('.external').addClass('hidden');
    var dir = $('#uploadDirectory')[0].files[0].path;
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
        console.log(dir);
        if (err) throw err;

        asyncCallsToDo = 0;
        for(var i = 0; i < results.length; i++)
            if(results[i].indexOf('.mp3') !== -1 || results[i].indexOf('.m4a') !== -1 || results[i].indexOf('.webm') !== -1)
            {
                asyncCallsToDo++;
            }


        for(var i = 0; i < results.length; i++)
        {
            if(results[i].indexOf('.mp3') !== -1 || results[i].indexOf('m4a') !== -1 || results[i].indexOf('.webm') !== -1)
                loadFile(results[i]);
        }

        $('#uploadDirectory').val('');
    });
}


function toggleHideAlbums()
{
    hideAlbums = !hideAlbums;
}


/////////////////////////////////////////////////////
/*///////////////// CONTEXT MENUS /////////////////*/
/////////////////////////////////////////////////////
function artistContextEvent(e)
{
    if(e.which == 3)
    {
        $('.contextContents').addClass('hidden');
        $('.selected').removeClass('selected');
        $('#artistMenu').removeClass('hidden');
        $('#artistMenu').css('left', e.pageX  - $('#artistMenu').width() - 16);
        if(e.pageY + $('#artistMenu').height() > $(window).height())
            $('#artistMenu').css('top', e.pageY - $('#artistMenu').height());
        else
            $('#artistMenu').css('top', e.pageY);
        $(e.target).addClass('selected');
        contextTarget = e.target;
    }
}

function albumContextEvent(e)
{
    if(e.which == 3)
    {
        $('.contextContents').addClass('hidden');
        $('.selected').removeClass('selected');
        $('#albumMenu').removeClass('hidden');
        $('#albumMenu').css('left', e.pageX - $('#albumMenu').width() - 16);
        if(e.pageY + $('#albumMenu').height() > $(window).height())
            $('#albumMenu').css('top', e.pageY - $('#albumMenu').height());
        else
            $('#albumMenu').css('top', e.pageY);
        $(e.target).addClass('selected');
        contextTarget = e.target;
    }
}

function songContextEvent(e)
{
    if(e.which == 3)
    {
        console.log($(window).height() + " " + e.pageY + " " + $('#songMenu').height());
        $('.contextContents').addClass('hidden');
        $('.selected').removeClass('selected');
        $('#songMenu').removeClass('hidden');
        $('#songMenu').css('left', e.pageX - $('#songMenu').width() - 16);
        if(e.pageY + $('#songMenu').height() > $(window).height())
            $('#songMenu').css('top', e.pageY - $('#songMenu').height());
        else
            $('#songMenu').css('top', e.pageY);
        $(e.target).addClass('selected');
        contextTarget = e.target;
    }
}

function addArtistToJukebox()
{
    var artist = contextTarget.id;
    var albums = $(document.getElementsByClassName(artist));
    var songs = [];
    for(var i = 0; i < albums.length; i++)
    {
        var albumSongs = $(document.getElementsByClassName(albums[i].getAttribute('id')));
        for(var j = 0; j < albumSongs.length; j++)
        {
            songs.push(albumSongs[j]);
        }
    }
    if(alwaysShuffle)
        shuffle(songs);
    for(var i = 0; i < songs.length; i++)
    {
        addToPlaylist(songs[i]);
    }
    $('#artistMenu').addClass('hidden');
}

function addArtistUpNext()
{
    var artist = contextTarget.id;
    var albums = $(document.getElementsByClassName(artist));

    var songs = [];
    for(var i = 0; i < albums.length; i++)
    {
        var albumSongs = $(document.getElementsByClassName(albums[i].getAttribute('id')));
        for(var j = 0; j < albumSongs.length; j++)
            songs.push(albumSongs[j]);
    }
    if(alwaysShuffle)
        shuffle(songs);
    for(var i = 0; i < songs.length; i++)
        addToFront(songs[i]);
    $('#artistMenu').addClass('hidden');
}

function addAlbumToJukebox()
{
    var album = contextTarget.id;
    var albumSongs = $(document.getElementsByClassName(album));
    if(alwaysShuffle)
        shuffle(albumSongs);
    for(var i = 0; i < albumSongs.length; i++)
        addToPlaylist(albumSongs[i]);

    $('#albumMenu').addClass('hidden');
}

function addAlbumUpNext()
{
    var album = contextTarget.id;
    var albumSongs = $(document.getElementsByClassName(album));
    if(alwaysShuffle)
        shuffle(albumSongs);
    for(var i = 0; i < albumSongs.length; i++)
    {
        addToFront(albumSongs[i]);
    }

    $('#albumMenu').addClass('hidden');
}

function addSongToJukebox()
{
    addToPlaylist(contextTarget);
    $('#songMenu').addClass('hidden');
}

function addSongUpNext()
{
    addToFront(contextTarget);
    $('#songMenu').addClass('hidden');
}
/////////////////////////////////////////////////////
/*///////////// END CONTEXT MENUS /////////////////*/
/////////////////////////////////////////////////////
