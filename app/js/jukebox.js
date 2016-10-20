'use strict';

/*
            Known Bugs:
// TODO: Bug when skipping songs rapidly.

*/

const SKIP_DELAY = 3.0;
const PLAYLIST_LENGTH = 22;

var howler = require('howler');
var ProgressBar = require('progressbar.js');

function SongData(path, type, name, album, artist)
{
    this.path = path;
    this.type = type;
    this.name = name;
    this.album = album;
    this.artist = artist;
}

var Jukebox = function()
{
    // Howler Music Player
     this.player = null;

     // Playlist Variables
     this.playlist = [];
     this.currentSong = null;
     this.priorSongs = [];

     // Candy Variables
     this.primaryColor = '';
     this.secondaryColor = '';
     this.mode = 'default';
     this.wave = new SiriWave({
         container: waves,
         width: 350,
         height: 300,
         cover: true,
         speed: .0040,
         amplitude: 0.5,
         frequency: 1.75,
         color: '#FFF',
     });
     this.wave.start();
     modColor(this.wave, 255, 255, 255, 0);

     // Variables that we handle since we load one track at a time
    this.autoplay = false;
    this.repeat = false;
    this.volume = 0.5;
    this.muted = false;
    this.isFinished = false;
    this.tempo = 60;

    // Networking
    this.broadcasting = false;

    this.circle = new ProgressBar.Circle('#progress',
    {
        strokeWidth: 6,
        trailWidth: 3,
        color: '#8888CC',
        duration: 0,
        trailColor: '#eee',
        from: {color: '#8888CC', a:0},
        to: {color: '#0000FF', a:1},
        step: function(state, circle)
        {
            circle.path.setAttribute('stroke', state.color);
        },
    });
    this.volumeBar = new ProgressBar.Line('#volume',
    {
        strokeWidth: 2,
        color: '#33CC33',
        trailColor: '#999999',
        trailWidth: 2,
        duration: 1,
        from: {color: '#CCCC33', a:0},
        to: {color: '#33CC33', a:1},
        step: function(state, circle)
        {
            circle.path.setAttribute('stroke', state.color);
        },
    });
    this.volumeBar.set(this.volume);
}
var jukebox = null;

// Jukebox Functions:
// insert(song{album, artist, name, path}), play(), mute(isMuted), changeVolume(0-1.0),
// seek(time), getState() - 'state', skip(), prev(), pause(), stop(), loop(), getPlaylist() - [],
// setArt('default'|'waves'|'always')
Jukebox.prototype =
{
    insert: function(song)
    {
        var self = this;
        // If this is the first song being inserted,
        // Initialize the player
        if(self.player == null || self.isFinished)
        {
            self.player = new howler.Howl
            ({
                src: [song.path],
                loop: false,
                volume: self.volume,
                mute: self.muted,
                onplay: function()
                {
                    $('#playControl').removeClass('play');
                    $('#playControl').addClass('pause');
                    self.currentSong = song;
                    self.circle.destroy();
                    self.circle = new ProgressBar.Circle('#progress',
                    {
                        strokeWidth: 5,
                        trailWidth: 3,
                        color: '#33CC33',
                        duration: self.player.duration() * 1000 - self.player.seek(),
                        trailColor: '#eee',
                        from: {color: '#33CC33', a:0},
                        to: {color: '#3333CC', a:1},
                        step: function(state, circle)
                        {
                            circle.path.setAttribute('stroke', state.color);
                        },
                    });
                    self.circle.set(self.player.seek() / self.player.duration());
                    self.circle.animate(1);
                    self.wave.setSpeed(.0120);
                },
                onload: function()
                {
                    self.isFinished = false;
                    $('#playerTitle').css('display', 'none');
                    $('#currentSong').text(song.name);
                    $('#currentSong').css('margin-top', '8px');
                    if(song.album == 'Youtube')
                    {
                        $('#byArtist').text('From: Youtube');
                        $('#onAlbum').text('---');
                    }
                    else {
                        $('#byArtist').text('By: ' + song.artist);
                        $('#onAlbum').text('On: ' + song.album);
                    }

                    $(".channel.active").children().text(song.name + " by " +
                                                            song.artist);
                    jsmediatags.read(song.path,
                    {
                        onSuccess: function(tag)
                        {
                            getCoverArt(tag);
                        },
                        onError: function(error)
                        {
                            console.log(':(', error.type, error.info);
                            getCoverArt();
                        },
                    });
                    if(self.autoplay)
                        self.player.play();
                },
                onloaderror: function()
                {
                    console.log('something has gone terribly wrong');
                    if(self.playlist.length > 0)
                        self.skip();
                    else
                        self.player = null;
                },
                onend: function()
                {
                    self.wave.setSpeed(.0040);
                    self.circle.stop();
                    // the jukebox will repeat itself if true
                    // so don't do anything else
                    if(!self.repeat)
                    {
                        self.isFinished = true;
                        self.priorSongs.push(self.currentSong);
                        // If songs remain in the playlist
                        if(self.playlist.length > 0)
                        {
                            $("#playList li:nth-child(2)").remove();
                            var nextSong = self.playlist.shift();
                            self.currentSong = nextSong;
                            self.insert(nextSong);
                        }
                        // nullify it for the next song to reinit
                        else
                            self.player = null;
                    }
                },
                onpause: function()
                {
                    $('#playControl').removeClass('pause');
                    $('#playControl').addClass('play');
                    self.circle.stop();
                    self.wave.setSpeed(.0040);
                },
                onstop: function()
                {
                    $('#playControl').removeClass('pause');
                    $('#playControl').addClass('play');
                    self.circle.stop();
                    self.wave.setSpeed(.0040);
                },
            });
        }
        else
        {
            self.playlist.push(song);
            insertToPlaylistGUI(song);
        }
    },
    insertToFront: function(song)
    {
        var self = this;
        if(self.player == null || self.isFinished)
            self.insert(song);
        else
        {
            self.playlist.unshift(song);
            insertToPlaylistGUI(song, 1);
        }
    },
    play: function()
    {
        this.autoplay = true;
        this.player.play();
        //this.wave.setSpeed(.0120);
    },
    mute: function(bool)
    {
        this.muted = bool;
        if(this.player != null)
            this.player.mute(bool);
    },
    changeVolume: function(vol)
    {
        this.volume = vol;
        this.wave.setAmplitude(this.volume);
        if(this.player != null)
            this.player.volume(vol);
    },
    // TODO: Change seekTo to seek to percentage
    // instead of amount of time (as is, it seeks to seekTo: seconds)
    seek: function(seekTo)
    {
        //if(this.player.state() == 'unloaded' ||
          // this.player.state() == 'loading')
           //return;
        this.player.seek(seekTo);
    },
    getState: function()
    {
        return this.player.state();
    },
    skip: function()
    {
        if(this.player == null) return;
        if(this.playlist.length > 0)
        {
            $("#playList li:nth-child(2)").remove();

            this.player.stop();
            this.isFinished = true;
            this.priorSongs.push(this.currentSong);
            var nextSong = this.playlist.shift();
            this.currentSong = nextSong;
            this.insert(nextSong);
            //if(this.autoplay)
            //    this.player.play();
        }

    },
    prev: function()
    {
        if(this.player == null) return;
        if(this.player.seek() > SKIP_DELAY)
        {
            this.player.stop();
            if(this.autoplay)
                this.player.play();
            return;
        }
        if(this.priorSongs.length > 0)
        {
            insertToPlaylistGUI(this.currentSong, 1);
            this.player.stop();
            this.isFinished = true;
            this.playlist.unshift(this.currentSong);
            var prevSong = this.priorSongs.pop();

            this.currentSong = prevSong;
            this.insert(prevSong);
        }
    },
    pause: function()
    {
        this.wave.setSpeed(.0040);
        this.autoplay = false;
        this.player.pause();
    },
    stop: function()
    {
        this.autoplay = false;
        this.player.stop();
    },
    // howler handles repeating but we need to not load-in
    // the next song
    loop: function(repeat)
    {
        this.repeat = repeat;
        this.player.loop(repeat);
    },
    getPlaylist: function()
    {
        return this.playlist;
    },
    setArt: function(mode)
    {
        this.mode = mode;
        if(this.mode == 'waves')
        {
            $('#activeCoverArt').addClass('hidden');
            $('#waves').removeClass('hidden');
        }
        else if(this.mode == 'always')
        {
            $('#activeCoverArt').removeClass('hidden');
            $('#waves').addClass('hidden');
        }
    }
}

// controls that get called from the html page
function playControl()
{
    if($('#playControl').hasClass('play'))
    {
        if(jukebox.player != null)
            jukebox.play();
    }
    else if($('#playControl').hasClass('pause'))
    {
        jukebox.pause();
    }
}

function insertToPlaylistGUI(song, mode)
{
    if(jukebox == null) return;

    if(mode == 1)
    {
        $("#playList li:eq(0)").after('<li>' +
            '<div class="songArtist">' +
            song.name + ', ' + song.artist + '</div>' +
            '<div class="up" onclick="moveUp(this)">&and;</div>' +
            '<div class="down" onclick="moveDown(this)">&or;</div>' +
            '<div class="top" onclick="moveTop(this)">&#8892;</div>' +
            '<div class="remove" onclick="remove(this)">X</div>' +
        '</li>');
    }
    else
    {
        $('#playList').append('<li>' +
            '<div class="songArtist">' +
            song.name + ', ' + song.artist + '</div>' +
            '<div class="up" onclick="moveUp(this)">&and;</div>' +
            '<div class="down" onclick="moveDown(this)">&or;</div>' +
            '<div class="top" onclick="moveTop(this)">&#8892;</div>' +
            '<div class="remove" onclick="remove(this)">x</div>' +
        '</li>');
    }

    $('#playList li:not(:first-child)').hover(
        function()
        {
            $(this).children('.songArtist').css('width', '150px');
        },
        function()
        {
            $(this).children('.songArtist').css('width', '350px');
        }
    );
}

function skipForward()
{
    jukebox.skip();
}

function skipBack()
{
    jukebox.prev();
}

function lowerVolume()
{
    if(jukebox.volume > 0)
    {
        var newVol = jukebox.volume -= .10;
        if(newVol < 0)
            jukebox.changeVolume(0);
        else
            jukebox.changeVolume(newVol)
        jukebox.volumeBar.set(jukebox.volume);
    }
}

function raiseVolume()
{
    if(jukebox.volume < 1.0)
    {
        var newVol = jukebox.volume += .10;
        if(newVol > 1.0)
            jukebox.changeVolume(1.0)
        else
            jukebox.changeVolume(newVol);
        jukebox.volumeBar.set(jukebox.volume);
    }
}

function moveUp(source)
{
    var list = $(source).parent().parent('#playList').children();
    source = $(source).parent();

    var index = list.index(source);

    // If it's not already the top...
    if(index != 1)
    {
        var eleUp = list[index];
        var eleDown = list[index-1];
        var temp = jukebox.playlist[index - 1];
        jukebox.playlist[index - 1] = jukebox.playlist[index - 2];
        jukebox.playlist[index - 2] = temp;
        $("#playList li:nth-child(" + (index) + ")").remove();
        $("#playList li:nth-child(" + (index) + ")").remove();


        $("#playList li:eq(" + (index - 2) + ")").after(eleDown);

        $('#playList li:not(:first-child)').hover(
            function()
            {
                $(this).children('.songArtist').css('width', '150px');
            },
            function()
            {
                $(this).children('.songArtist').css('width', '350px');
            }
        );
        $("#playList li:eq(" + (index - 2) + ")").after(eleUp);

        $('#playList li:not(:first-child)').hover(
            function()
            {
                $(this).children('.songArtist').css('width', '150px');
            },
            function()
            {
                $(this).children('.songArtist').css('width', '350px');
            }
        );
    }
}

function moveDown(source)
{
    var list = $(source).parent().parent('#playList').children();
    source = $(source).parent();

    var index = list.index(source);

    // If it's not already the top...
    if(index != (list.length - 1))
    {
        var eleUp = list[index];
        var eleDown = list[index+1];
        var temp = jukebox.playlist[index];
        jukebox.playlist[index] = jukebox.playlist[index - 1];
        jukebox.playlist[index - 1] = temp;
        $("#playList li:nth-child(" + (index+1) + ")").remove();
        $("#playList li:nth-child(" + (index+1) + ")").remove();

        $("#playList li:eq(" + (index - 1) + ")").after(eleUp);

        $('#playList li:not(:first-child)').hover(
            function()
            {
                $(this).children('.songArtist').css('width', '150px');
            },
            function()
            {
                $(this).children('.songArtist').css('width', '350px');
            }
        );
        $("#playList li:eq(" + (index - 1) + ")").after(eleDown);

        $('#playList li:not(:first-child)').hover(
            function()
            {
                $(this).children('.songArtist').css('width', '150px');
            },
            function()
            {
                $(this).children('.songArtist').css('width', '350px');
            }
        );
    }
}

function moveTop(source)
{
    var list = $(source).parent().parent('#playList').children();
    source = $(source).parent();

    var index = list.index(source);

    // If it's not already the top...
    if(index != 1)
    {
        var eleUp = list[index];

        var temp = jukebox.playlist[index - 1];
        var removeIndex = jukebox.playlist.indexOf(temp);
        jukebox.playlist.splice(removeIndex, 1);
        jukebox.playlist.unshift(temp);
        $("#playList li:nth-child(" + (index+1) + ")").remove();
        $("#playList li:eq(0)").after(eleUp);
        $('#playList li:not(:first-child)').hover(
            function()
            {
                $(this).children('.songArtist').css('width', '150px');
            },
            function()
            {
                $(this).children('.songArtist').css('width', '350px');
            }
        );
    }
}

function remove(source)
{
    var list = $(source).parent().parent('#playList').children();
    source = $(source).parent();

    var index = list.index(source);

    var removeIndex = jukebox.playlist.indexOf(jukebox.playlist[index - 1]);
    jukebox.playlist.splice(removeIndex, 1);
    $("#playList li:nth-child(" + (index+1) + ")").remove();
}

/**
 *  Gets the cover art and puts it in #coverArt
 *  Also handles cases where the cover art doesn't exist
 */
function getCoverArt(tag)
{
    if(jukebox.mode == 'waves' || tag === undefined) {generateWaves(); return;}
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
        if(jukebox.mode == 'default' || jukebox.mode == 'always')
        {
            $('#waves').addClass('hidden');
            $('#activeCoverArt').removeClass('hidden');
            changeArt(base64);
        }

        /*var colorThief = new ColorThief();
        var palette = colorThief.getPalette(document.getElementById('activeCoverArt'), 2);
        var dominateColor = colorThief.getColor(document.getElementById('activeCoverArt'));
        jukebox.primaryColor = rgbToHex(dominateColor[0], dominateColor[1], dominateColor[2]);
        jukebox.secondaryColor = rgbToHex(palette[0][0], palette[0][1], palette[0][2]);
        console.log(jukebox.secondaryColor);
        console.log(jukebox.primaryColor);*/
    }
    else /* This handles the image when the data isn't available */
    {
        if(jukebox.mode == 'default') {generateWaves(); return;}
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
        if(genreName == 'ROCK' && jukebox.mode == 'always')
            changeArt("imgs/cover_art/rockCoverArt.png");
        else if(genreName != 'none' && jukebox.mode == 'always')
        {
            console.log("unhandled genre without art: " + genreName);
            changeArt("imgs/cover_art/unknownArt.jpg");
        }
        else
        {
            if(jukebox.mode == 'always')
                changeArt("imgs/cover_art/unknownArt.jpg");
        }
    }
}

/**
 *  Changes which image is active/inactive which fades in the new image
 *  TODO: Gotta fix it
 */
function changeArt(src)
{
    var activeImage = $("#activeCoverArt");
    activeImage.attr("src", src);
}

function generateWaves()
{
    $('#activeCoverArt').attr("src", 'imgs/discIcon.png');
    $('#activeCoverArt').addClass('hidden');
    $('#waves').removeClass('hidden');
}

function componentToHex(c)
{
    var hex = c.toString(16);
    return hex.length == 1 ? '0' + hex: hex;
}

function rgbToHex(r, g, b)
{
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function resetColor() {modColor(jukebox.wave, 255, 255, 255, 0);}
function modColor(wave, red, green, blue, mode)
{
    var r;
    var g;
    var b;
    switch(mode)
    {
        case 0: // start: 255,255,255 - end: 255,0,255
            r = red;
            g = green - 5;
            b = blue;
            if(g <= 0)
            {
                g = 0;
                mode = 1;
            }
            break;
        case 1: // start: 255,0,255 - end: 255,0,0
            r = red;
            g = green;
            b = blue - 5;
            if(b <= 0)
            {
                b = 0;
                mode = 2;
            }
            break;
        case 2: // start: 255,0,0 - end: 255,255,0
            r = red;
            g = green + 5;
            b = blue;
            if(g >= 255)
            {
                g = 255;
                mode = 3;
            }
            break;
        case 3: // start: 255,255,0 - end: 0,255,0
            r = red - 5;
            g = green;
            b = blue;
            if(r <= 0)
            {
                r = 0;
                mode = 4;
            }
            break;
        case 4: // start: 0, 255, 0 - end: 0, 255, 255
            r = red;
            g = green;
            b = blue + 5;
            if(b >= 255)
            {
                b = 255;
                mode = 5;
            }
            break;
        case 5: // start: 0, 255, 255 - end: 0, 0, 255
            r = red;
            g = green - 5;
            b = blue;
            if(g <= 0)
            {
                g = 0;
                mode = 6;
            }
            break;
        case 6: // start: 0, 0, 255 - end: 255, 255, 255
            r = red + 5;
            g = green + 5;
            b = blue;
            if(r >= 255 | g >= 255)
            {
                r = 255;
                g = 255
                mode = 0;
            }
            break;
    }

    var color = r + ',' + g + ',' + b;
    wave.color = color;
    setTimeout(modColor, 250, wave, r, g, b, mode);
}
