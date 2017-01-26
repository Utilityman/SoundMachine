/* global $ path */
'use strict';

/*
            Known Bugs:
  TODO: Songs no longer duplicate when skipping
        quickly but instead, skips are sloowwww
  TODO: Shuffle all with many songs slows the window,
        limit the amount of displayed songs to something reasonable
  TODO: Reproduce bug where user can't use prev. (Try skipping then using prev)
  TODO: Reproduce bug where user can't use skip
  TODO: file-not-found stops everything! howto handle 'onloaderror'
  TODO: Get rid of waves - unecessary time spent doing not much - espeically since most of the time we have album art
*/

const SKIP_DELAY = 3.0;

// TODO: Use this to set a max length of GUI represented songs in the playlist
const PLAYLIST_LENGTH = 31; // eslint-disable-line

// Music Stuffs
let jsmediatags = require('jsmediatags');
let howler = require('howler');
let ProgressBar = require('progressbar.js');
let genreData = require(path.join(__dirname, '/data/genre.json'));

function SongData (path, type, name, album, artist, songID) { // eslint-disable-line
  this.path = path;
  this.type = type;
  this.name = name;
  this.album = album;
  this.artist = artist;
  this.id = 'sd-' + songID;
}

let Jukebox = function () {
  // Howler Music Player
  this.player = null;

  // Playlist variables
  this.playlist = [];
  this.currentSong = null;
  this.priorSongs = [];

  // Candy variables
  this.primaryColor = '';
  this.secondaryColor = '';
  this.mode = 'default';

  // vartiables that we handle since we load one track at a time
  this.autoplay = false;
  this.repeat = false;
  this.volume = 0.5;
  this.muted = false;
  this.isFinished = false;
  this.tempo = 60;

  // vartiables about skipping.
  this.skips = 0;
  this.busy = false;

  // Networking
  this.broadcasting = false;

  this.circle = new ProgressBar.Circle('#progress',
    {
      strokeWidth: 6,
      trailWidth: 3,
      color: '#6868CC',
      duration: 0,
      trailColor: '#eee',
      from: {color: '#6868CC', a: 0},
      to: {color: '#5555FF', a: 1},
      step: function (state, circle) {
        circle.path.setAttribute('stroke', state.color);
      }
    });

  this.volumeBar = new ProgressBar.Line('#volume',
    {
      strokeWidth: 2,
      color: '#33CC33',
      trailColor: '#999999',
      trailWidth: 2,
      duration: 1,
      from: {color: '#CCCC33', a: 0},
      to: {color: '#33CC33', a: 1},
      step: function (state, circle) {
        circle.path.setAttribute('stroke', state.color);
      }
    });
  this.volumeBar.set(this.volume);
};

let jukebox = null;

// Jukebox Functions:
/* insert(song{album, artist, name, path}) - mostly correct
       insertToFront(song) - inserts to front, mostly relies on the insert(Song) method
       play() - works: only is called from onclick methods from the page
       mute(bool) - works (to my knowledge), not implemented because there is no button!
       changeVolume(0-1.0) - works, gets called from onbutton onclick methods
       seek(time) - works, not implemented. Needs to be changed to seek to percentage (or just a different method)
       getState() - returns the state. Not really used anywhere.
       skip() - does its job in a way that doesn't create bugs, most of the time
       prev() - does its job in a way that doesn't create bugs, most of the time
       pause() - works: similar to play, is only ever called from onclick methods
       stop() - useless? PRUNE probably
       loop() - sets the player to loop the current song. NOT TESTED
       getPlaylist() - returns the playlist of the jukebox, useful when sending information over network
       setArt('default'|'waves'|'always') - sets the art mode for future songs and current song

   Most of the heavy lifting comes from the insert function and the howler object that it creates.
   That howler object has a few methods that help control flow:
       onplay - called when the player is played. Only after loading and called by this.player.play(). Manages duration circle
       onload - called when a song is loaded. This gets the art and sets window texts.
       onloaderror - TODO handling when things break
       onend - called when a song ends, automatically. Handles moving onto the next song
       onpause - called when the song is stopped midway but not reset.
       onstop - called when the song is reset to the beginning.
*/
Jukebox.prototype =
{
  insert: function (song) {
    let self = this;
    self.busy = true;
    // If this is the first song being inserted,
    // Initialize the player
    if (self.player == null || self.isFinished) {
      // if (self.isFinished) self.player.stop();
      self.player = new howler.Howl({
        src: [song.path],
        loop: false,
        volume: self.volume,
        mute: self.muted,
        onplay: function () {
          $('#playControl').removeClass('play');
          $('#playControl').addClass('pause');
          self.currentSong = song;
          self.circle.destroy();
          self.circle = new ProgressBar.Circle('#progress',
            {
              strokeWidth: 5,
              trailWidth: 3,
              color: '#6868CC',
              duration: self.player.duration() * 1000 - self.player.seek(),
              trailColor: '#eee',
              from: {color: '#6868CC', a: 0},
              to: {color: '#5555FF', a: 1},
              step: function (state, circle) {
                circle.path.setAttribute('stroke', state.color);
              }
            });
          self.circle.set(self.player.seek() / self.player.duration());
          self.circle.animate(1);
        },
        onload: function () {
          self.isFinished = false;
          $('#playerTitle').css('display', 'none');
          $('#currentSong').text(song.name);
          $('#currentSong').css('margin-top', '8px');
          if (song.album === 'Youtube') {
            $('#byArtist').text('From: Youtube');
            $('#onAlbum').text('---');
          } else {
            $('#byArtist').text('By: ' + song.artist);
            $('#onAlbum').text('On: ' + song.album);
          }

          $('.channel.active').children().text(song.name + ' by ' +
                                                  song.artist);
          jsmediatags.read(song.path,
            {
              onSuccess: function (tag) {
                getCoverArt(tag);
              },
              onError: function (error) {
                console.log(':(', error.type, error.info);
                getCoverArt();
              }
            });
          if (self.autoplay) {
            self.player.play();
          }
          self.busy = false;
        },
        onloaderror: function () {
          console.log('something has gone horribly wrong');
          // self.player.unload();
        },
        onend: function () {
          self.circle.stop();
          // the jukebox will repeat itself if true
          // so don't do anything else
          if (!self.repeat) {
            self.isFinished = true;
            self.priorSongs.push(self.currentSong);
            // If songs remain in the playlist
            if (self.playlist.length > 0) {
              $('#playList li:nth-child(2)').remove();
              let nextSong = self.playlist.shift();
              self.currentSong = nextSong;
              self.insert(nextSong);
            } else {
              // nullify it for the next song to reinit
              $('#playControl').removeClass('pause');
              $('#playControl').addClass('play');
              // self.player = null;
              self.circle.set(0);
            }
          }
        },
        onpause: function () {
          $('#playControl').removeClass('pause');
          $('#playControl').addClass('play');
          self.circle.stop();
        },
        onstop: function () {
          $('#playControl').removeClass('pause');
          $('#playControl').addClass('play');
          self.circle.stop();
        }
      });
    } else {
      self.playlist.push(song);
      insertToPlaylistGUI(song);
      self.busy = false;
    }
  },
  insertToFront: function (song) {
    let self = this;
    if (self.player == null || self.isFinished) {
      self.insert(song);
    } else {
      self.playlist.unshift(song);
      insertToPlaylistGUI(song, 1);
      self.busy = false;
    }
  },
  play: function () {
    this.autoplay = true;
    this.player.play();
  },
  mute: function (bool) {
    this.muted = bool;
    if (this.player != null) {
      this.player.mute(bool);
    }
  },
  changeVolume: function (vol) {
    this.volume = vol;
    if (this.player != null) {
      this.player.volume(vol);
    }
  },
  // TODO: Change seekTo to seek to percentage
  // instead of amount of time (as is, it seeks to seekTo: seconds)
  // TODO: Actually use this...
  seek: function (seekTo) {
    // if (this.player.state() == 'unloaded' ||
      // this.player.state() == 'loading')
       // return;
    this.player.seek(seekTo);
  },
  getState: function () {
    return this.player.state();
  },
  skip: function () {
    if (this.player == null) return;

    if (this.playlist.length > 0 && !this.busy) {
      $('#playList li:nth-child(2)').remove();
      this.player.stop();
      this.isFinished = true;
      this.priorSongs.push(this.currentSong);
      let nextSong = this.playlist.shift();
      this.currentSong = nextSong;
      this.insert(nextSong);
      this.skips -= 1;
    }
  },
  prev: function () {
    if (this.player == null) return;
    if (this.player.seek() > SKIP_DELAY) {
      this.player.stop();
      if (this.autoplay) {
        this.player.play();
      }
      return;
    } else if (this.priorSongs.length > 0) {
      insertToPlaylistGUI(this.currentSong, 1);
      this.player.stop();
      this.isFinished = true;
      this.playlist.unshift(this.currentSong);
      let prevSong = this.priorSongs.pop();

      this.currentSong = prevSong;
      this.insert(prevSong);
    } else if (this.playlist.length === 0) {
      this.player.stop();
      this.isFinished = true;
      this.insert(this.currentSong);
    }
  },
  pause: function () {
    this.autoplay = false;
    this.player.pause();
  },
  stop: function () {
    this.autoplay = false;
    this.player.stop();
  },
  // howler handles repeating but we need to not load-in
  // the next song
  loop: function (repeat) {
    this.repeat = repeat;
    this.player.loop(repeat);
  },
  getPlaylist: function () {
    return this.playlist;
  },
  setArt: function (mode) {
    this.mode = mode;
    if (this.mode === 'waves') {
      $('#activeCoverArt').addClass('hidden');
      $('#waves').removeClass('hidden');
    } else if (this.mode === 'always') {
      $('#activeCoverArt').removeClass('hidden');
      $('#waves').addClass('hidden');
    }
  }
};

function playControl () {  // eslint-disable-line
                          // this is used in HTML elements
  if ($('#playControl').hasClass('play')) {
    if (jukebox.player != null) {
      jukebox.play();
    }
  } else if ($('#playControl').hasClass('pause')) {
    jukebox.pause();
  }
}

function insertToPlaylistGUI (song, mode) {
  console.log(song);
  if (jukebox == null) return;

  // mode == 1 puts the song up next
  if (mode === 1) {
    $('#playList li:eq(0)').after('<li class=' + song.id + '>' +
      '<div class="songArtist">' +
      song.name + ', ' + song.artist + '</div>' +
      '<div class="up" onclick="moveUp(this)">&and;</div>' +
      '<div class="down" onclick="moveDown(this)">&or;</div>' +
      '<div class="top" onclick="moveTop(this)">&#8892;</div>' +
      '<div class="remove" onclick="remove(this)">X</div>' +
    '</li>');
  } else {
    $('#playList').append('<li class=' + song.id + '>' +
      '<div class="songArtist">' +
      song.name + ', ' + song.artist + '</div>' +
      '<div class="up" onclick="moveUp(this)">&and;</div>' +
      '<div class="down" onclick="moveDown(this)">&or;</div>' +
      '<div class="top" onclick="moveTop(this)">&#8892;</div>' +
      '<div class="remove" onclick="remove(this)">X</div>' +
    '</li>');
  }

  $('#playList .' + song.id).hover(
    function () {
      $(this).children('.songArtist').css('width', '146px');
    },
    function () {
      $(this).children('.songArtist').css('width', '350px');
    }
  );
}

function skipForward () {  // eslint-disable-line
                           // this is used in HTML elements
  jukebox.skips += 1;
  doSkips();
}

function doSkips () {  // eslint-disable-line
                       // this is used in HTML elements
  jukebox.skip();
  if (jukebox.skips > 0) {
    setTimeout(doSkips, 250);
  }
}

function skipBack () {  // eslint-disable-line
                        // this is used in HTML elements
  jukebox.prev();
}

function lowerVolumem () {  // eslint-disable-line
                            // this is used in HTML elements
  if (jukebox.volume > 0) {
    let newVol = jukebox.volume -= 0.10;
    if (newVol < 0) {
      jukebox.changeVolume(0);
    } else {
      jukebox.changeVolume(newVol);
    }
    jukebox.volumeBar.set(jukebox.volume);
  } else {
    $.notify('Volume can\'t be decreased lower!', 'warn');
  }
}

function raiseVolume () {  // eslint-disable-line
                           // this is used in HTML elements
  console.log(jukebox.volume);
  if (jukebox.volume < 1.0) {
    let newVol = jukebox.volume += 0.10;
    if (newVol > 1.0) {
      jukebox.changeVolume(1.0);
    } else {
      jukebox.changeVolume(newVol);
    }
    jukebox.volumeBar.set(jukebox.volume);
  } else {
    $.notify('Volume can\'t be raised higher!', 'warn');
  }
}

function moveUp (source) {  // eslint-disable-line
                            // this is used in HTML elements
  let list = $(source).parent().parent('#playList').children();
  source = $(source).parent();

  let index = list.index(source);

  // If it's not already the top...
  if (index !== 1) {
    let eleUp = list[index];
    let eleDown = list[index - 1];
    let temp = jukebox.playlist[index - 1];
    jukebox.playlist[index - 1] = jukebox.playlist[index - 2];
    jukebox.playlist[index - 2] = temp;
    $('#playList li:nth-child(' + (index) + ')').remove();
    $('#playList li:nth-child(' + (index) + ')').remove();

    $('#playList li:eq(' + (index - 2) + ')').after(eleDown);

    $('#playList li:not(:first-child)').hover(
      function () {
        $(this).children('.songArtist').css('width', '146px');
      },
      function () {
        $(this).children('.songArtist').css('width', '350px');
      }
    );
    $('#playList li:eq(' + (index - 2) + ')').after(eleUp);

    $('#playList li:not(:first-child)').hover(
      function () {
        $(this).children('.songArtist').css('width', '146px');
      },
      function () {
        $(this).children('.songArtist').css('width', '350px');
      }
    );
  }
}

function moveDown (source) {  // eslint-disable-line
                              // this is used in HTML elements
  let list = $(source).parent().parent('#playList').children();
  source = $(source).parent();

  let index = list.index(source);

  // If it's not already the top...
  if (index !== (list.length - 1)) {
    let eleUp = list[index];
    let eleDown = list[index + 1];
    let temp = jukebox.playlist[index];
    jukebox.playlist[index] = jukebox.playlist[index - 1];
    jukebox.playlist[index - 1] = temp;
    $('#playList li:nth-child(' + (index + 1) + ')').remove();
    $('#playList li:nth-child(' + (index + 1) + ')').remove();

    $('#playList li:eq(' + (index - 1) + ')').after(eleUp);

    $('#playList li:not(:first-child)').hover(
      function () {
        $(this).children('.songArtist').css('width', '146px');
      },
      function () {
        $(this).children('.songArtist').css('width', '350px');
      }
    );
    $('#playList li:eq(' + (index - 1) + ')').after(eleDown);

    $('#playList li:not(:first-child)').hover(
      function () {
        $(this).children('.songArtist').css('width', '146px');
      },
      function () {
        $(this).children('.songArtist').css('width', '350px');
      }
    );
  }
}

function moveTop (source) {  // eslint-disable-line
                            // this is used in HTML elements
  let list = $(source).parent().parent('#playList').children();
  source = $(source).parent();

  let index = list.index(source);

  // If it's not already the top...
  if (index !== 1) {
    let eleUp = list[index];

    let temp = jukebox.playlist[index - 1];
    let removeIndex = jukebox.playlist.indexOf(temp);
    jukebox.playlist.splice(removeIndex, 1);
    jukebox.playlist.unshift(temp);
    $('#playList li:nth-child(' + (index + 1) + ')').remove();
    $('#playList li:eq(0)').after(eleUp);
    $('#playList li:not(:first-child)').hover(
      function () {
        $(this).children('.songArtist').css('width', '146px');
      },
      function () {
        $(this).children('.songArtist').css('width', '350px');
      }
    );
  }
}

function remove (source) {  // eslint-disable-line
                            // this is used in HTML elements
  let list = $(source).parent().parent('#playList').children();
  source = $(source).parent();

  let index = list.index(source);

  let removeIndex = jukebox.playlist.indexOf(jukebox.playlist[index - 1]);
  jukebox.playlist.splice(removeIndex, 1);
  $('#playList li:nth-child(' + (index + 1) + ')').remove();
}

/**
 *  Gets the cover art and puts it in #coverArt
 *  Also handles cases where the cover art doesn't exist
 */
function getCoverArt (tag) {
  let image = tag.tags.picture;
  /* If the image exists, create the base64 image from the data and display it */
  if (image) {
    let base64String = '';
    for (let i = 0; i < image.data.length; i++) {
      base64String += String.fromCharCode(image.data[i]);
    }
    let base64 = 'data:' + image.format + ';base64,' + window.btoa(base64String);
    if (jukebox.mode === 'default' || jukebox.mode === 'always') {
      $('#waves').addClass('hidden');
      $('#activeCoverArt').removeClass('hidden');
      changeArt(base64);
    }
  } else /* This handles the image when the data isn't available */ {
    let genreName = 'none';
    if (tag.tags.genre) {
      genreName = tag.tags.genre;
    } else if (tag.tags.gnre) {
      if (genreData[tag.tags.gnre.data]) {
        genreName = genreData[tag.tags.gnre.data];
      }
    }
    if (genreName === 'ROCK' && jukebox.mode === 'always') {
      changeArt('imgs/cover_art/rockCoverArt.png');
    } else if (genreName !== 'none' && jukebox.mode === 'always') {
      console.log('unhandled genre without art: ' + genreName);
      changeArt('imgs/cover_art/unknownArt.jpg');
    } else {
      if (jukebox.mode === 'always') {
        changeArt('imgs/cover_art/unknownArt.jpg');
      }
    }
  }
}

/**
 *  Changes which image is active/inactive which fades in the new image
 *  TODO: Gotta fix it
 */
function changeArt (src) {
  let activeImage = $('#activeCoverArt');
  activeImage.attr('src', src);
}
