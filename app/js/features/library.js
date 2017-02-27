'use strict';

/* global fs path jukebox SongData $ toggleWindow jsmediatags sendProgress */
/* eslint-disable no-unused-vars */
/**
 *  TODO: This file is huge and needs to be shortened, consider what is library code and what isnt.
 *  This file contains the functions and variables for
 *  the library pane.
 *
 *  Library should be its own module? Currently all these functions are floating in
 *  global namespace and it might be better to make a difference between functions
 *  which need to be in the global namespace and those which do not.
 *  e.g.
 *  shuffle() should be private to the library - nothing else uses it
 *  setupLibraryPane should be public (defined by the prototype) as one
 *  should be able to call library.setupLibraryPane in order to initialize a library.
 *
 *  A few of these functions are shared with the
 *  Playlists tab - perhaps those should be 'Player' functions
 *  not specifically library functions
 */

let ytdl = require('ytdl-core');

let Tree = require(path.join(__dirname, '/js/tree.js'));

 // TODO: Make a switch to change default loadout?
 /**
    library mode is what the user decides to sort/show by
    by default this mode is set to 'artists'.
    i.e. libraryMode = 'song' hides albums and artists and shows
                        a sorted library by song name.
    Possible modes = {'artist', 'album', 'song'}
*/
let libraryMode = 'artist';
 /**
    When an artist is selected, does it show their songs or albums?
    If hideAlbums is false, it will show their albums.
    If hideAlbums is true, it will show their songs.
 */
let hideAlbums = false;
/**
  Shuffle songs whenever adding or add in order?
  By default, songs are shuffled when added.
*/
let alwaysShuffle = true;

// Collections
let collection = new Tree();
let miniCollection = new Tree();

// Other letiables
let setup = false;
let asyncCalls = 0;
let asyncCallsToDo = 0;
let contextTarget = null;

$(document).ready(function () {
  $('#uploadFile').change(function () {
    $('#selectFiles').addClass('hidden');
    $('#addFiles').removeClass('hidden');
  });
  $('#uploadDirectory').change(function () {
    $('#selectDirectory').addClass('hidden');
    $('#addDirectory').removeClass('hidden');
  });
  $('#youtubeUpload').change(function () {
    console.log($('#youtubeUpload').val());
    $('#youtubeUpload').prop('disabled', true);
    $('#youtubeUpload').css('color', '#666666');
    streamFromYoutube($('#youtubeUpload').val());
  });
});

/**
 * shuffle method taken from: https://bost.ocks.org/mike/shuffle/
 */
function shuffle (array) {
  let m = array.length;
  let t; let i;

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

/**
 *  Iterates over songs[] immediately after the library
 *  is read in so that the complete library is included in
 *  the manifest.
 */
function createManifest () {
  fs.writeFile(path.join(__dirname, '/data/manifest.json'), JSON.stringify(collection),
    function (err) {
      if (err) console.log('error writing manifest.json');
    });
}

/**
 *  This function gets called from the startup()
 *  function during the startup process to load
 *  the entire library from the manifest.
 */
function loadFromManifest () {
  let manifest;
  fs.stat(path.join(__dirname, '/data/manifest.json'), function (err, stat) {
    if (err == null) {
      // TODO: BAD READING FILES
      manifest = require(path.join(__dirname, '/data/manifest.json'));
    } else if (err.code === 'ENOENT') {
      manifest = {};
    } else {
      console.log('strange error reading manifest.json');
    }

    if (manifest.branches && manifest.branches.length !== 0) {
      for (let i = 0; i < manifest.branches.length; i++) {
        for (let j = 0; j < manifest.branches[i].branches.length; j++) {
          for (let k = 0; k < manifest.branches[i].branches[j].branches.length; k++) {
            loadFile(manifest.branches[i].branches[j].branches[k].branches[0].item,
                manifest.branches[i].item,
                manifest.branches[i].branches[j].item,
                manifest.branches[i].branches[j].branches[k].item);
          }
        }
      }
    } else if (!setup) {
      setupLibraryPane();
    }
  });
}

/**
 * @param param the file path
 * @param artist,album,song self explanatory
 */
function loadFile (param, artist, album, song) {
  let lastIndex = param.lastIndexOf('.');
  if (lastIndex === -1) return 'invalid file';
  if (!validFile(param)) return 'file not found!';
  let type = param.substring(lastIndex + 1, param.length);

  // Make sure the path is an accepted type
  if (type === 'mp3' || type === 'm4a' || type === 'webm') {
    asyncCalls++;
    // this self executing function handles the async process of adding songs to the library.
    (function (path, ext, album, artist, song) {
      // if everything was given to the method then we don't
      // need to read for metadata, just use the given data
      // (this case happens when reading from manifest)
      if (typeof album !== 'undefined' &&
         typeof artist !== 'undefined' &&
         typeof song !== 'undefined') {
        setTimeout(function () { loadFileWrapUp(artist, album, song, path); }, 500);
      } else if (ext === 'webm') {
        let fileName = path.substring(path.lastIndexOf('/') + 1);
        setTimeout(function () {
          loadFileWrapUp('Unknown',
                         'Unknown',
                         fileName.substring(0, fileName.length - (ext.length + 1)),
                         path);
        }, 500);
      } else {
        jsmediatags.read(path, {
          onSuccess: function (tag) {
            loadFileWrapUp(tag.tags.artist,
                              tag.tags.album,
                              tag.tags.title,
                              path);
          },
          onError: function (err) {
            console.log('jsmediatags error :', err.type, err.info);
          }
        });
      }
    })(param, type, album, artist, song);
  }
}

/**
 * checks whether or not a file exists given a path to it
 * @param path path-to-file to check validitity
 */
function validFile (path) {
  try {
    fs.statSync(path);
    // console.log("file Exists");
    return true;
  } catch (e) {
    // console.log("file does not exist!");
    return false;
  }
}

function loadFileWrapUp (artist, album, title, path) {
  collection.addAll(artist, album, title, path);
  asyncCalls--;
  asyncCallsToDo--;
  if (asyncCalls === 0 && !setup) {
    setupLibraryPane();
  } else if (setup) {
    miniCollection.addAll(artist, album, title, path);

    if (asyncCallsToDo === 0) appendToLibraryPane(miniCollection);
  }

  if (!setup) sendProgress(asyncCalls);
}

function addYoutubeFileToCollection (youtube, title, path) {
  miniCollection.addAll(youtube,
                      youtube,
                      title,
                      path);
  collection.addAll(youtube,
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
 *
 *  We don't check for duplicate artists/albums/songs because -
 *  @see Tree.prototype.addAll (tree.js 46)
 */
function setupLibraryPane () {
  if (setup) return;   // is this what we want to do?

  createManifest();   // the collection is complete - so we do this
  let baseList = $('#resourceTree');
  let artists = collection.branches;
  for (let i = 0; i < artists.length; i++) {
    addArtistDOM(baseList, artists[i].id, artists[i].item);

    let albums = collection.getAlbumsFromArtist(artists[i].id);
    for (let j = 0; j < albums.length; j++) {
      addAlbumDOM(baseList, artists[i].id, albums[j].id, albums[j].item);

      let songs = collection.getSongsFromArtistAlbum(artists[i].id, albums[j].id);
      for (let k = 0; k < songs.length; k++) {
        addSongDOM(baseList, artists[i].id, albums[j].id,
                      songs[k].id, songs[k].item);
      }
    }
  }

  $('#librarySettings').text('Library Options');
  sortBy(libraryMode);
  toggleWindow();
  console.log('setup!');
  setup = true;
  console.log(collection);
}

/**
 *  Like setupLibraryPane() but instead appends to it.
 *
 *  Though this code may seem very similar to setupLibaryPane(),
 *  it is incredibly different due to the tests that are run in
 *  order to determine whether or not the artist/album/song is
 *  a new entry and to determine the ID of each respective thing.
 *
 * breaks are used to speed up lookup from N time to N-remaining time
 * continues are used to escape a bad iteration
 */
function appendToLibraryPane (miniCollection) {
  /**
   *  Songs exist inside of collection, we just have to check if
   *  they're represented in the GUI and then get their ID from the collection
   */
  let baseList = $('#resourceTree');
  let artistList = $('#resourceTree .artist');
  let albumList = $('#resourceTree .album');
  let titles = $('#resourceTree .song');

  let found = false;

  // artist level
  let newArtists = miniCollection.branches;
  for (let j = 0; j < newArtists.length; j++) {
    found = false;
    let artistID = collection.getArtistID(newArtists[j].item);

    if (artistID !== -1) {
      for (let i = 0; i < artistList.length; i++) {
        if (compareArtistDOMToIDs($(artistList[i]), artistID)) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(newArtists[j].item + ' not in the library -- adding it');
        addArtistDOM(baseList, artistID, newArtists[j].item);
      }
    } else {
      console.log('err: artistID retreival went wrong for ' + newArtists[j].item);
      continue;
    }

    // album level
    let newAlbums = miniCollection.getAlbumsFromArtist(newArtists[j].id);
    for (let k = 0; k < newAlbums.length; k++) {
      found = false;
      let albumID = collection.getAlbumID(artistID, newAlbums[k].item);
      console.log(albumID);

      if (albumID !== -1) {
        for (let i = 0; i < albumList.length; i++) {
          if (compareAlbumDOMToIDs($(albumList[i]), artistID, albumID)) {
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(newAlbums[k].item + ' not in the library -- adding it');
          addAlbumDOM(baseList, artistID, albumID, newAlbums[k].item);
        }
      } else /* if albumID === -1 */ {
        console.log('err: albumID retreival went wrong for ' + newAlbums[k].item);
        continue;
      }

      let newSongs = miniCollection.getSongsFromArtistAlbum(newArtists[j].id, newAlbums[k].id);
      for (let a = 0; a < newSongs.length; a++) {
        found = false;
        let songID = collection.getSongID(artistID, albumID, newSongs[a].item);

        if (songID !== -1) {
          for (let i = 0; i < titles.length; i++) {
            if (compareSongDOMToIDs($(titles[i]), artistID, albumID, songID)) {
              found = true;
              break;
            }
          }
          if (!found) {
            console.log(newSongs[a].item + ' not in library -- addding it');
            addSongDOM(baseList, artistID, albumID, songID, newSongs[a].item);
            // addSongDOM(baseList, artists[i].id, albums[j].id, songs[k].id, songs[k].item);
          }
        } else /* if songID === -1 */ {
          console.log('err: songID retreival went wrong for ' + newSongs[a].item);
        } // end else
      } // end for songs
    } // end for albums
  } // end for artists

  createManifest();
  miniCollection = new Tree();
  sortBy(libraryMode);
  $.notify('Songs Added', 'success');
}

function addArtistDOM (list, artistID, artistItem) {
  if (list === 'undefined' || artistID === 'undefined') {
    return console.log('DONT ADD UNDEFINED THINGS');
  }
  list.append('<li id="artist' + artistID +
                  '" class="artist' +
                  '" onclick="showAlbums(this)">' + artistItem + '</li>');
  $('#artist' + artistID).mousedown(function (event) {
    artistContextEvent(event);
  });
}

function addAlbumDOM (list, artistID, albumID, albumItem) {
  list.append('<li id="artist' + artistID + '-album' + albumID +
                  '" class="artist' + artistID + ' album hidden' +
                  '" onclick="showSongs(this)">' +
                  albumItem + '</li>');
  $('#artist' + artistID + '-album' + albumID).mousedown(function (event) {
    albumContextEvent(event);
  });
}

function addSongDOM (list, artistID, albumID, songID, songItem) {
  list.append('<li id="artist' + artistID +
    '-album' + albumID + '-song' + songID +
    '" class="artist' + artistID +
    '-album' + albumID +
    ' song hidden' +
    '" onclick="addToPlaylist(this)">' +
    songItem + '</li>');

  $('#artist' + artistID + '-album' + albumID + '-song' + songID).mousedown(function (event) {
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
function sortBy (sort) {
  $('#resourceTree #sortBy').removeClass('active');
  $('.sort').addClass('hidden');
  $('.addAll').addClass('hidden');

  if (sort === 'album') {
    $('#hideAlbums').prop('disabled', true);
    libraryMode = 'album';
    $('#resourceTree .artist').addClass('hidden');
    $('#resourceTree .song').addClass('hidden');
    $('#resourceTree .album').removeClass('active');
    let albums = $('#resourceTree .album');

    let resourceTree = $('#resourceTree');
    albums.removeClass('hidden');
    albums.sort(function (a, b) {
      return $(a).text().toUpperCase().replace('THE ', '').localeCompare($(b).text().toUpperCase().replace('THE ', ''));
    });
    $.each(albums, function (idx, itm) { resourceTree.append(itm); });

    for (let i = 0; i < albums.length; i++) {
      let songs = $(document.getElementsByClassName(albums[i].id));
      for (let j = 0; j < songs.length; j++) {
        $(albums[i]).after(songs[j]);
      }
    }
    return;
  } else if (sort === 'song') {
    $('#hideAlbums').prop('disabled', false);
    libraryMode = 'song';
    $('#resourceTree .artist').addClass('hidden');
    $('#resourceTree .album').addClass('hidden');
    let resourceTree = $('#resourceTree');
    let songs = $('#resourceTree .song');
    songs.removeClass('hidden');
    songs.sort(function (a, b) {
      return $(a).text().toUpperCase().replace('THE ', '').localeCompare($(b).text().toUpperCase().replace('THE ', ''));
    });
    $.each(songs, function (idx, itm) { resourceTree.append(itm); });
  } else if (sort === 'artist') {
    $('#hideAlbums').prop('disabled', false);
    libraryMode = 'artist';
    $('#resourceTree .album').addClass('hidden');
    $('#resourceTree .song').addClass('hidden');

    let artists = $('#resourceTree .artist');

    let resourceTree = $('#resourceTree');
    artists.removeClass('hidden');
    artists.sort(function (a, b) {
      return $(a).text().toUpperCase().replace('THE ', '').localeCompare($(b).text().toUpperCase().replace('THE ', ''));
    });
    $.each(artists, function (idx, itm) { resourceTree.append(itm); });

    for (let i = 0; i < artists.length; i++) {
      let albums = $(document.getElementsByClassName(artists[i].id));
      for (let j = 0; j < albums.length; j++) {
        $(artists[i]).after(albums[j]);
        let songs = $(document.getElementsByClassName(albums[j].id));
        for (let k = 0; k < songs.length; k++) {
          $(albums[j]).after(songs[k]);
        }
      }
    }
    return;
  }
}

/**
 *  Artist onclick event. This shows the albums that belong to the artist
 */
function showAlbums (origin) {
  console.log(origin);
  if ($(origin).hasClass('active') || $('.' + $(origin).attr('id')).hasClass('active')) {
    // collapse if clicked again
    $(origin).removeClass('active');
    $('.album').addClass('hidden');
    $('.song').addClass('hidden');
  } else if (libraryMode === 'album') {
    // this should not happen
    $('#resourceTree .artist').addClass('hidden');
    $.notify('Something went wrong, but we fixed it :)', 'warn');
  } else if (libraryMode === 'song') {
    $('#resourceTree .album').addClass('hidden');
    $('#resourceTree .artist').addClass('hidden');
    $.notify('Something went wrong, but we fixed it :)', 'warn');
  } else if (libraryMode === 'artist') {
    $('#resourceTree .active').removeClass('active');
    $(origin).addClass('active');
    $('.album').addClass('hidden');
    $('.song').addClass('hidden');

    if (!hideAlbums) { // show albums
      $('.' + $(origin).attr('id')).removeClass('hidden');
    } else {
      let albums = $('.' + $(origin).attr('id'));
    }
  }

  $('#artistMenu').addClass('hidden');
}

function showSettings (origin) {
  if ($('#librarySettings').hasClass('active')) {
    $('#resourceTree .setting').addClass('hidden');
    $('#resourceTree .sort').addClass('hidden');
    $('#resourceTree .external').addClass('hidden');
    $('#resourceTree .addAll').addClass('hidden');
    $('#librarySettings').removeClass('active');
    return;
  } else if (libraryMode === 'artist') {
    $('#resourceTree .active').removeClass('active');
    $('#resourceTree .album.active').removeClass('acitve');
    $('#resourceTree .sort').addClass('hidden');
    $('#resourceTree .album').addClass('hidden');
    $('#resourceTree .song').addClass('hidden');
  } else if (libraryMode === 'album') {
    $('#resourceTree .active').removeClass('active');
    $('#resourceTree .album.active').removeClass('acitve');
    $('#resourceTree .sort').addClass('hidden');
    $('#resourceTree .song').addClass('hidden');
  }

  // Show settings
  $('#librarySettings').addClass('active');
  $('#resourceTree .setting').removeClass('hidden');
}

/**
 *  Album onclick event. This shows the songs belonging to album
 */
function showSongs (origin) {
  console.log(origin);

  if ($(origin).hasClass('active')) {
    // collapse if clicked again
    $(origin).removeClass('active');
    $('.song').addClass('hidden');
  } else if (hideAlbums || libraryMode === 'song') {
    $('#resourceTree .album').addClass('hidden');
  } else if (libraryMode === 'album' || libraryMode === 'artist') {
    $('#resourceTree .active').removeClass('active');
    $(origin).addClass('active');
    $('.song').addClass('hidden');

    $('.' + $(origin).attr('id')).removeClass('hidden');
  }
  $('#albumMenu').addClass('hidden');
}

function showSortSettings (origin) {
  $('#resourceTree .addAll').addClass('hidden');
  $('#resourceTree #addAll').removeClass('active');
  $('#resourceTree .external').addClass('hidden');
  $('#resourceTree #externalOptions').removeClass('active');
  if ($('#resourceTree #sortBy').hasClass('active')) {
    $('#resourceTree #sortBy').removeClass('active');
    $('#resourceTree .sort').addClass('hidden');
    return;
  }
  $('#resourceTree #sortBy').addClass('active');
  $('#resourceTree .sort').removeClass('hidden');
}

function showAddAllOptions () {
  $('#resourceTree .external').addClass('hidden');
  $('#resourceTree .sort').addClass('hidden');
  $('#resourceTree #exernalOptions').removeClass('active');
  $('#resourceTree #sortBy').removeClass('active');
  if ($('#resourceTree #addAll').hasClass('active')) {
    $('#resourceTree #addAll').removeClass('active');
    $('#resourceTree .addAll').addClass('hidden');
    return;
  }
  $('#resourceTree #addAll').addClass('active');
  $('#resourceTree .addAll').removeClass('hidden');
}

function showExternalOptions () {
  $('#resourceTree .addAll').addClass('hidden');
  $('#resourceTree #addAll').removeClass('active');
  $('#resourceTree #sortBy').removeClass('active');
  $('#resourceTree .sort').addClass('hidden');
  if ($('#resourceTree #externalOptions').hasClass('active')) {
    $('#resourceTree #externalOptions').removeClass('active');
    $('#resourceTree .external').addClass('hidden');
    return;
  }
  $('#resourceTree #externalOptions').addClass('active');
  $('#resourceTree .external').removeClass('hidden');
}

function compareArtistDOMToIDs (source, artistID) {
  if ($(source).hasClass('artist')) {
    let ids = $(source).attr('id').split('-');
    if (parseInt(ids[0].replace(/\D/g, '')) === artistID) {
      return true;
    }
  }
  return false;
}

function compareAlbumDOMToIDs (source, artistID, albumID) {
  if ($(source).hasClass('album')) {
    let ids = $(source).attr('id').split('-');
    if (parseInt(ids[0].replace(/\D/g, '')) === artistID &&
       parseInt(ids[1].replace(/\D/g, '')) === albumID) {
      return true;
    }
  }
  return false;
}

function compareSongDOMToIDs (source, artistID, albumID, songID) {
  if ($(source).hasClass('song')) {
    let ids = $(source).attr('id').split('-');
    if (parseInt(ids[0].replace(/\D/g, '')) === artistID &&
        parseInt(ids[1].replace(/\D/g, '')) === albumID &&
        parseInt(ids[2].replace(/\D/g, '')) === songID) {
      return true;
    }
  }
  return false;
}

/**
 * gets entire song data from DOM
 */
function getSongDataFromDOM (source) {
  if (!$(source).hasClass('song')) return null;
  let songIDs = $(source).attr('id').split('-');
  return collection.getSongSecure(
     parseInt(songIDs[0].replace(/\D/g, '')),
     parseInt(songIDs[1].replace(/\D/g, '')),
     parseInt(songIDs[2].replace(/\D/g, '')));
}

/**
 *  Song onlick event. This adds the clicked song to the playlist
 *  Also can simply be called if you find the song DOM element
 */
function addToPlaylist (origin) {
  let originID = $(origin).attr('id');
  let collectionData = getSongDataFromDOM(origin);
  if (!collectionData) return console.log('unexpected crazy error with ' + collectionData);

  jukebox.insert(new SongData(collectionData[0],
      collectionData[0].substring(collectionData[0].length - 3,
          collectionData[0].length),
          collectionData[3],
          collectionData[2],
          collectionData[1],
          originID));
}

/**
 *  gets called from context menus after this song discovery process
 */
function addToFront (origin) {
  let originID = $(origin).attr('id');
  let collectionData = getSongDataFromDOM(origin);

  if (!collectionData) return console.log('unexpected crazy error with ' + collectionData);

  jukebox.insertToFront(new SongData(collectionData[0],
      collectionData[0].substring(collectionData[0].length - 3,
          collectionData[0].length),
          collectionData[3],
          collectionData[2],
          collectionData[1],
          originID));
}

function modifyMetaData () {
  console.log(contextTarget);
  $('.contextContents').addClass('hidden');
  $(contextTarget).notify({}, {
    elementPosition: 'left',
    style: 'metadata',
    autoHide: false,
    clickToHide: false
  });
  $('.metadataEntry').val($(contextTarget).text());
  $('.metadataEntry').keypress(function (e) {
    if (e.keyCode === 13) submitMetadata();
  });
  $('.metadataEntry').focus();
}

function submitMetadata () {
  if ($(contextTarget).hasClass('artist')) {
    let artistID = $(contextTarget).attr('id').replace(/\D/g, '');
    let overwriteID = collection.containsArtist($('.metadataEntry').val());
    console.log(overwriteID);
    if (overwriteID !== -1) {
      $('.notifyjs-wrapper').trigger('notify-hide');
      if (artistID !== overwriteID) {
        $.notify('Cannot Overwrite Artists!', 'warn');
      }
    } else {
      let changeVal = $('.metadataEntry').val();
      collection.modifyArtistFromID(artistID, changeVal);
      $(contextTarget).text(changeVal);
      $('.notifyjs-wrapper').trigger('notify-hide');
      $.notify('Renamed Artist', 'success');
    }
  } else if ($(contextTarget).hasClass('album')) {
    console.log('album handling');
    console.log($('.metadataEntry').val());
    // TODO: $('.metadataEntry').val() stops working after cannot overwrite albums once?
    let albumIDs = $(contextTarget).attr('id').split('-');
    let overwriteID = collection.containsAlbum(albumIDs[0].replace(/\D/g, ''),
                                                $('.metadataEntry').val());
    if (overwriteID !== -1) {
      $('.notifyjs-wrapper').trigger('notify-hide');
      if (albumIDs[1].replace(/\D/g, '') !== overwriteID) {
        $.notify('Cannot Overwrite Albums!', 'warn');
      }
    } else {
      let changeVal = $('.metadataEntry').val();
      collection.modifyAlbumByID(albumIDs[0].replace(/\D/g, ''),
                                  albumIDs[1].replace(/\D/g, ''),
                                  changeVal);
      $(contextTarget).text(changeVal);
      $('.notifyjs-wrapper').trigger('notify-hide');
      $.notify('Renamed Album', 'success');
    }
  } else if ($(contextTarget).hasClass('song')) {
    console.log('song handling');
    let songIDs = $(contextTarget).attr('id').split('-');
    let overwriteID = collection.containsSong(songIDs[0].replace(/\D/g, ''),
                                              songIDs[1].replace(/\D/g, ''),
                                              $('.metadataEntry').val());
    if (overwriteID !== -1) {
      $('.notifyjs-wrapper').trigger('notify-hide');
      if (songIDs[2].replace(/\D/g, '') !== overwriteID) {
        $.notify('Cannot Overwrite Song!', 'warn');
      }
    } else {
      let changeVal = $('.metadataEntry').val();
      collection.modifySongByID(songIDs[0].replace(/\D/g, ''),
                                  songIDs[1].replace(/\D/g, ''),
                                  songIDs[2].replace(/\D/g, ''),
                                  changeVal);
      $(contextTarget).text(changeVal);
      $('.notifyjs-wrapper').trigger('notify-hide');
      $.notify('Renamed Song', 'success');
    }
  }

  // finally rewrite the manifest to save changes
  createManifest();
}

// TODO: Consider how removing anything from the tree will impact IDs.
function removeTarget (source) {
  $(source).text('Coming Soon!');
}

function addArtistToPlaylist () {

}

function addAlbumtoPlaylist () {

}

function addSongToPlaylist () {

}

// test: https://www.youtube.com/watch?v=R20f-TPKjzc
function streamFromYoutube (yourl) {
  if (yourl.indexOf('youtube.com') !== -1) {
    $('#youtubeUpload').val('Downloading...');
    ytdl.getInfo(yourl, function (err, info) {
      if (err) {
        youtubeError(err);
        return;
      }
      let stream = ytdl(yourl, { filter: function (format) { return format.container === 'webm'; } })
      .pipe(fs.createWriteStream(path.join(__dirname, '/data/downloads/', info.title + '.webm')))
      .on('finish', function () {
        addYoutubeFileToCollection('Youtube', info.title, path.join(__dirname, '/data/downloads/', info.title + '.webm'));
        $('#youtubeUpload').prop('disabled', false);
        $('#youtubeUpload').css('color', 'black');
        $('#youtubeUpload').val('Download Success!');
      });
    });
  } else {
    $('#youtubeUpload').val('Searching...');

    $('#youtubeUpload').prop('disabled', false);
    $('#youtubeUpload').css('color', 'black');
    $('#youtubeUpload').val('Search Not Implemented Yet!');
  }
}

function youtubeError (err) {
  if (err) console.log('youtubeError!');
  $('#youtubeUpload').val('Download Failed!');
  $('#youtubeUpload').prop('disabled', false);
  $('#youtubeUpload').css('color', 'black');
}

// TODO: sortLi is gone, and needs to be replaced
function addAll (mode) {
  if (mode === 'album') {
    let albums = $('#resourceTree .album');
    // sortLi(albums);
    for (let i = 0; i < albums.length; i++) {
      let songs = $(document.getElementsByClassName(albums[i].id));
      for (let j = 0; j < songs.length; j++) {
        addToPlaylist(songs[j]);
      }
    }
    return;
  } else if (mode === 'song') {
    let songs = $('#resourceTree .song');
    // sortLi(songs);
    for (let j = 0; j < songs.length; j++) {
      addToPlaylist(songs[j]);
    }
    return;
  } else if (mode === 'artist') {
    let artists = $('#resourceTree .artist');
    // sortLi(artists);

    for (let i = 0; i < artists.length; i++) {
      let albums = $(document.getElementsByClassName(artists[i].id));
      for (let j = 0; j < albums.length; j++) {
        let songs = $(document.getElementsByClassName(albums[j].id));
        for (let k = 0; k < songs.length; k++) {
          addToPlaylist(songs[k]);
        }
      }
    }
    return;
  } else if (mode === 'shuffle') {
    let songs = $('#resourceTree .song');
    shuffle(songs);
    shuffle(songs);
    for (let j = 0; j < songs.length; j++) {
      addToPlaylist(songs[j]);
    }
    return;
  }
}

function addUpload () {
  $('#selectFiles').removeClass('hidden');
  $('#addFiles').addClass('hidden');

  let upload = $('#uploadFile');
  asyncCallsToDo = upload[0].files.length;
  for (let i = 0; i < upload[0].files.length; i++) {
    loadFile(upload[0].files[i].path);
  }

  $('#uploadFile').val('');
}

function addDirectory () {
  $('#addDirectory').addClass('hidden');
  $('#selectDirectory').removeClass('hidden');

  let dir = $('#uploadDirectory')[0].files[0].path;
  let walk = function (dir, done) {
    let results = [];
    fs.readdir(dir, function (err, list) {
      if (err) return done(err);
      let i = 0;
      (function next () {
        let file = list[i++];
        if (!file) return done(null, results);
        file = path.resolve(dir, file);
        fs.stat(file, function (err, stat) {
          if (err) console.log('fs.stat err');
          if (stat && stat.isDirectory()) {
            walk(file, function (err, res) {
              if (err) console.log('walk(file) err');
              results = results.concat(res);
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      })();
    });
  };
  walk(dir, function (err, results) {
    console.log(dir);
    if (err) throw err;
    asyncCallsToDo = 0;

    for (let i = 0; i < results.length; i++) {
      if (results[i].indexOf('.mp3') !== -1 || results[i].indexOf('.m4a') !== -1 || results[i].indexOf('.webm') !== -1) {
        asyncCallsToDo++;
      }
    }
    for (let i = 0; i < results.length; i++) {
      if (results[i].indexOf('.mp3') !== -1 ||
        results[i].indexOf('m4a') !== -1 ||
        results[i].indexOf('.webm') !== -1) {
        loadFile(results[i]);
      }
    }

    $('#uploadDirectory').val('');
  });
}

function toggleHideAlbums () {
  hideAlbums = !hideAlbums;
}

function artistContextEvent (e) {
  if (e.which === 3) {
    $('.contextContents').addClass('hidden');
    $('.selected').removeClass('selected');
    $('#artistMenu').removeClass('hidden');
    $('#artistMenu').css('left', e.pageX - $('#artistMenu').width() - 16);
    if (e.pageY + $('#artistMenu').height() > $(window).height()) {
      $('#artistMenu').css('top', e.pageY - $('#artistMenu').height());
    } else {
      $('#artistMenu').css('top', e.pageY);
    }
    $(e.target).addClass('selected');
    contextTarget = e.target;
  }
}

function albumContextEvent (e) {
  if (e.which === 3) {
    $('.contextContents').addClass('hidden');
    $('.selected').removeClass('selected');
    $('#albumMenu').removeClass('hidden');
    $('#albumMenu').css('left', e.pageX - $('#albumMenu').width() - 16);
    if (e.pageY + $('#albumMenu').height() > $(window).height()) {
      $('#albumMenu').css('top', e.pageY - $('#albumMenu').height());
    } else {
      $('#albumMenu').css('top', e.pageY);
    }
    $(e.target).addClass('selected');
    contextTarget = e.target;
  }
}

function songContextEvent (e) {
  if (e.which === 3) {
    $('.contextContents').addClass('hidden');
    $('.selected').removeClass('selected');
    $('#songMenu').removeClass('hidden');
    $('#songMenu').css('left', e.pageX - $('#songMenu').width() - 16);
    if (e.pageY + $('#songMenu').height() > $(window).height()) {
      $('#songMenu').css('top', e.pageY - $('#songMenu').height());
    } else {
      $('#songMenu').css('top', e.pageY);
    }
    $(e.target).addClass('selected');
    contextTarget = e.target;
  }
}

function addArtistToJukebox () {
  let artist = contextTarget.id;
  let albums = $(document.getElementsByClassName(artist));
  let songs = [];
  for (let i = 0; i < albums.length; i++) {
    let albumSongs = $(document.getElementsByClassName(albums[i].getAttribute('id')));
    for (let j = 0; j < albumSongs.length; j++) {
      songs.push(albumSongs[j]);
    }
  }
  if (alwaysShuffle) {
    shuffle(songs);
  }
  for (let i = 0; i < songs.length; i++) {
    addToPlaylist(songs[i]);
  }
  $('#artistMenu').addClass('hidden');
}

function addArtistUpNext () {
  let artist = contextTarget.id;
  let albums = $(document.getElementsByClassName(artist));

  let songs = [];
  for (let i = 0; i < albums.length; i++) {
    let albumSongs = $(document.getElementsByClassName(albums[i].getAttribute('id')));
    for (let j = 0; j < albumSongs.length; j++) {
      songs.push(albumSongs[j]);
    }
  }
  if (alwaysShuffle) {
    shuffle(songs);
  }
  for (let i = 0; i < songs.length; i++) {
    addToFront(songs[i]);
  }
  $('#artistMenu').addClass('hidden');
}

function addAlbumToJukebox () {
  let album = contextTarget.id;
  let albumSongs = $(document.getElementsByClassName(album));
  if (alwaysShuffle) {
    shuffle(albumSongs);
  }
  for (let i = 0; i < albumSongs.length; i++) {
    addToPlaylist(albumSongs[i]);
  }

  $('#albumMenu').addClass('hidden');
}

function addAlbumUpNext () {
  let album = contextTarget.id;
  let albumSongs = $(document.getElementsByClassName(album));
  if (alwaysShuffle) {
    shuffle(albumSongs);
  }
  for (let i = 0; i < albumSongs.length; i++) {
    addToFront(albumSongs[i]);
  }

  $('#albumMenu').addClass('hidden');
}

function addSongToJukebox () {
  addToPlaylist(contextTarget);
  $('#songMenu').addClass('hidden');
}

function addSongUpNext () {  // eslint-disable-line
                             // this is used in HTML elements
  addToFront(contextTarget);
  $('#songMenu').addClass('hidden');
}

function toggleAlwaysShuffle () {  // eslint-disable-line
                                   // this is used in HTML elements
  alwaysShuffle = !alwaysShuffle;
}

/* eslint-enable no-unused-vars */
