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

 //TODO: Make a switch to change default loadout?
 /**
    library mode is what the user decides to sort/show by
    by default this mode is set to 'artists'.
    i.e. libraryMode = 'song' hides albums and artists and shows
                        a sorted library by song name.
    Possible modes = {'artist', 'album', 'song'}
*/
 var libraryMode = 'artist';
 /**
    When an artist is selected, does it show their songs or albums?
    If hideAlbums is false, it will show their albums.
    If hideAlbums is true, it will show their songs.
 */
 var hideAlbums = false;
 /**
    Shuffle songs whenever adding or add in order?
    By default, songs are shuffled when added.
 */
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
            // TODO: BAD READING FILES
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

/**
 * @param param the file path
 * @param artist,album,song self explanatory
 */
function loadFile(param, artist, album, song)
{
    var lastIndex = param.lastIndexOf('.');
    if(lastIndex == -1) return "invalid file";
    if(!validFile(param)) return "file not found!";
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
                setTimeout(function() { loadFileWrapUp(artist, album, song, path);}, 500);
            }
            else if(ext == 'webm')
            {
                var fileName = path.substring(path.lastIndexOf("/") + 1);
                setTimeout(function() {
                    loadFileWrapUp("Unknown",
                                   "Unknown",
                                   fileName.substring(0, fileName.length - (ext.length + 1)),
                                   path);
                    }, 500);
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
                        console.log('jsmediatags error :', err.type, err.info);
                    },
                });
            }
        })(param, type, album, artist, song);
    }
}

/**
 * checks whether or not a file exists given a path to it
 * @param path path-to-file to check validitity
 */
function validFile(path)
{
    try
    {
        fs.statSync(path);
        //console.log("file Exists");
        return true;
    } catch (e)
    {
        //console.log("file does not exist!");
        return false;
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

 * TODO: redo models
 */
function setupLibraryPane()
{
    if(setup) return;   // is this what we want to do?
    // At this point, the async  process has called back...
    // so the collection can be written.
    createManifest();
    var baseList = $("#resourceTree");

    var artists = collection.branches;
    for(var i = 0; i < artists.length; i++)
    {
        // Created li element for artists:
        // <li id="<Artist_Name>" class='artist' onclick="showArtists(this)">Artist Name</li>
        addArtistDOM(baseList, artists[i].id, artists[i].item);

        var albums = collection.getAlbumsFromArtist(artists[i].id);
        for(var j = 0; j < albums.length; j++)
        {
        //Created li element for albums:
        // <li class="album hidden <Artist_Name>" id="<Album_Name>_<Artist_Name>"
            addAlbumDOM(baseList, artists[i].id, albums[j].id, albums[j].item)

            var songs = collection.getSongsFromArtistAlbum(artists[i].id, albums[j].id);
            for(var k = 0; k < songs.length; k++)
            {
                // Created li element for songs:
                // <li id="<song_name>" class="song hidden <album_name>_<artist_name>"
                addSongDOM(baseList, artists[i].id, albums[j].id,
                            songs[k].id, songs[k].item);
            }
        }
    }

    $("#librarySettings").text("Library Options");
    sortBy(libraryMode);
    toggleWindow();
    console.log('setup!');
    setup = true;
    console.log(collection);
}

/**
 *  TODO: SO MUCH REPEATED CODE! D:
 *  Like setupLibraryPane() but instead appends to it.
 */
function appendToLibraryPane(miniCollection)
{
    createManifest();

    var baseList = $("#resourceTree");
    var artistList = $('#resourceTree .artist');
    var albumList = $('#resourceTree .album');
    var titles = $('#resourceTree .song');

    var found = false;
    var newArtists = miniCollection.branches;

    // This is a mess but it works, if ever reading through - read carefully
    // Essentially this goes through each level of the miniColl
    for(var j = 0; j < newArtists.length; j++)
    {
        found = false;
        for(var i = 0; i < artistList.length; i++)
            if(artistList[i].innerHTML == newArtists[j].item)
                found = true;
        if(!found)
        {
            addArtistDOM(baseList, newArtists[j].id, newArtist[j].item);
        }

        var newAlbums = miniCollection.getAlbumsFromArtist(artists[i].id);
        for(var k = 0; k < newAlbums.length; k++)
        {
            found = false;
            for(var i = 0; i < albumList.length; i++)
                if(albumList[i].innerHTML == newAlbums[k].item)
                    found = true;
            if(!found)
            {
                addAlbumDOM(baseList, newArtists[j].id, newAlbums[k].id, newAlbums[k].item)
            }
            var newSongs = miniCollection.getSongsFromArtistAlbum(artists[i].id, albums[j].id);
            for(var a = 0; a < newSongs.length; a++)
            {
                found = false;
                for(var i = 0; i < titles.length; i++)
                    if(titles[i].innerHTML == newSongs[a].item)
                        found = true;
                if(!found)
                {
                    addSongDOM(baseList, newArtists[j].id, newAlbums[k].id,
                                newSongs[a].id, newSongs[a].item);
                }
            }
        }
    }

    miniCollection = new Tree();
    sortBy(libraryMode);
}

function addArtistDOM(list, artistID, artistItem)
{
    if(list === 'undefined' || artistID === 'undefined')
        return console.log('DONT ADD UNDEFINED THINGS');
    list.append('<li id="artist' + artistID +
                    '" class="artist' +
                    '" onclick="showAlbums(this)">'+ artistItem + '</li>');
    $('#artist' + artistID).mousedown(function(event)
    {
        artistContextEvent(event);
    });
}

function addAlbumDOM(list, artistID, albumID, albumItem)
{
    list.append('<li id="artist' + artistID + '-album' + albumID +
                    '" class="artist' + artistID + ' album hidden' +
                    '" onclick="showSongs(this)">' +
                    albumItem + '</li>');
    $('#artist' + artistID + '-album' + albumID).mousedown(function(event)
    {
        albumContextEvent(event);
    });
}

function addSongDOM(list, artistID, albumID, songID, songItem)
{
    list.append('<li id="artist' + artistID +
                    '-album' + albumID + '-song' + songID +
                    '" class="artist' + artistID
                    + '-album' + albumID +
                    ' song hidden' +
                    '" onclick="addToPlaylist(this)">' +
                    songItem + '</li>');

    $('#artist' + artistID + '-album' + albumID + '-song' +
        songID).mousedown(function(event)
    {
        songContextEvent(event);
    });
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
    $('#resourceTree #sortBy').removeClass('active');
    $('.sort').addClass('hidden');
    $('.addAll').addClass('hidden');

    if(sort == 'album')
    {
        $('#hideAlbums').prop('disabled', true);
        libraryMode = 'album';
        $("#resourceTree .artist").addClass('hidden');
        $('#resourceTree .song').addClass('hidden');
        $('#resourceTree .album').removeClass('active');
        var albums = $("#resourceTree .album");

        var resourceTree = $('#resourceTree');
        albums.removeClass('hidden');
        albums.sort(function(a, b)
        {
            return $(a).text().toUpperCase().replace("THE ", "").localeCompare($(b).text().toUpperCase().replace("THE ", ""));
        });
        $.each(albums, function(idx, itm) {resourceTree.append(itm); });

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
        var resourceTree = $('#resourceTree');
        var songs = $("#resourceTree .song");
        songs.removeClass('hidden');
        songs.sort(function(a, b)
        {
            return $(a).text().toUpperCase().replace("THE ", "").localeCompare($(b).text().toUpperCase().replace("THE ", ""));
        });
        $.each(songs, function(idx, itm) {resourceTree.append(itm); });
    }
    else if(sort == 'artist')
    {
        $('#hideAlbums').prop('disabled', false);
        libraryMode = 'artist';
        $('#resourceTree .album').addClass('hidden');
        $('#resourceTree .song').addClass('hidden');

        var artists = $("#resourceTree .artist");

        var resourceTree = $('#resourceTree');
        artists.removeClass('hidden');
        artists.sort(function(a, b)
        {
            return $(a).text().toUpperCase().replace("THE ", "").localeCompare($(b).text().toUpperCase().replace("THE ", ""));
        });
        $.each(artists, function(idx, itm) {resourceTree.append(itm); });

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

/////////////////////////////////////////////////////
/*//////////// BEGIN SHOW FUNCTIONS ///////////////*/
/////////////////////////////////////////////////////

/**
 *  Artist onclick event. This shows the albums that belong to the artist
 */
function showAlbums(origin)
{
    if($(origin).hasClass('active'))
    {
        // collapse if clicked again
        $(origin).removeClass('active');
        $('.album').addClass('hidden');
        $('.song').addClass('hidden');
    }
    else if(libraryMode == 'album')
    {
        // this should not happen
        $("#resourceTree .artist").addClass('hidden');
        showNotification("Something went wrong, but we fixed it :)");
    }
    else if(libraryMode == 'song')
    {
        $("#resourceTree .album").addClass('hidden');
        $("#resourceTree .artist").addClass('hidden');
        showNotification("Something went wrong, but we fixed it :)");
    }
    else if(libraryMode == 'artist')
    {
        $('#resourceTree .active').removeClass('active');
        $(origin).addClass('active');
        $('.album').addClass('hidden');
        $('.song').addClass('hidden');

        if(!hideAlbums) // show albums
            $('.' + $(origin).attr('id')).removeClass('hidden');
        else
        {
            var albums = $('.' + $(origin).attr('id'));
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
    if($(origin).hasClass('active'))
    {
        // collapse if clicked again
        $(origin).removeClass('active');
        $('.song').addClass('hidden');
    }
    else if(hideAlbums || libraryMode == 'song')
        $('#resourceTree .album').addClass('hidden');
    else if(libraryMode == 'album' || libraryMode == 'artist')
    {
        $('#resourceTree .active').removeClass('active');
        $(origin).addClass('active');
        $('.song').addClass('hidden');

        $('.' + $(origin).attr('id')).removeClass('hidden');
    }
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
 * gets song form DOM
 */
 function getSongFromDOM(source)
 {
     if(!$(source).hasClass('song')) return null;
     var songIDs = $(source).attr('id').split('-');
     return collection.getSongSecure(
         songIDs[0].replace(/\D/g,''),
         songIDs[1].replace(/\D/g,''),
         songIDs[2].replace(/\D/g,''))
 }

/**
 *  Song onlick event. This adds the clicked song to the playlist
 *  Also can simply be called if you find the song DOM element
 */
function addToPlaylist(origin)
{
    var collectionData = getSongFromDOM(origin);

    if(!collectionData) return console.log("unexpected crazy error with " + songIDs);

    jukebox.insert(new SongData(collectionData[0],
        collectionData[0].substring(collectionData[0].length-3,
            collectionData[0].length),
            collectionData[3],
            collectionData[2],
            collectionData[1]));
}

/**
 *  gets called from context menus after this song discovery process
 */
function addToFront(origin)
{
    var collectionData = getSongFromDOM(origin);

    if(!collectionData) return console.log("unexpected crazy error with " + songIDs);

    jukebox.insertToFront(new SongData(collectionData[0],
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
