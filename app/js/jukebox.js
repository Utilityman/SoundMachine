
const SKIP_DELAY = 3;

var howler = require('howler');

var Jukebox = function()
{
    // Howler Music Player
     this.player = null;

     // Playlist Variables
     this.playlist = [];
     this.currentSong = null;
     this.priorSongs = [];

     // Variables that we handle since we load one track at a time
    this.autoplay = true;
    this.repeat = false;
    this.volume = 0.1;
    this.muted = false;
    this.isFinished = false;
}

Jukebox.prototype =
{
    insert: function(song)
    {
        var self = this;
        // If this is the first song being inserted,
        // Initialize the player
        if(self.player == null || self.isFinished)
        {
            console.log(song.path);

            self.player = new howler.Howl
            ({
                src: [song.path],
                loop: false,
                volume: self.volume,
                mute: self.muted,
                onplay: function()
                {
                    self.currentSong = song;
                },
                onload: function()
                {
                    self.isFinished = false;
                    jsmediatags.read(song.path,
                    {
                        onSuccess: function(tag)
                        {
                            $("#songArtistAlbum").text(song.name + ", " +
                                                       song.artist + " on " +
                                                       song.album);
                            $(".channel.active").children().text(song.name + " by " +
                                                                    song.artist);
                            getCoverArt(tag);
                        },
                        onError: function(error)
                        {
                            console.log(':(', error.type, error.info);
                        },
                    });
                    self.play();
                },
                onloaderror: function()
                {
                    console.log('something has gone terribly wrong');
                },
                onend: function()
                {
                    // the jukebox will repeat itself if true
                    // so don't do anything else
                    if(!self.repeat)
                    {
                        self.isFinished = true;
                        self.priorSongs.push(self.currentSong);
                        // If songs remain in the playlist
                        if(self.playlist.length > 0)
                        {
                            var nextSong = self.playlist.shift();
                            console.log(nextSong);
                            self.currentsong = nextSong;
                            self.insert(nextSong);
                            if(self.autoplay)
                                self.player.play();
                        }
                        // nullify it for the next song to reinit
                        else
                            self.player = null;
                    }
                },
                onpause: function()
                {

                },
                onstop: function()
                {

                },
            });
        }
        else
        {
            self.playlist.push(song);
            $("#playList").append('<li>' + song.name +
                                ", " + song.artist + '</li>');
        }
    },
    play: function()
    {
        this.autoplay = true;
        this.player.play();
    },
    mute: function(bool)
    {
        this.muted = bool;
        this.player.mute(bool);
    },
    changeVolume: function(vol)
    {
        this.volume = vol;
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
    state: function()
    {
        return this.player.state();
    },
    skip: function()
    {

    },
    prev: function()
    {

    },
    pause: function()
    {
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
    }
}

/**
 *  Gets the cover art and puts it in #coverArt
 *  Also handles cases where the cover art doesn't exist
 */
function getCoverArt(tag)
{
    var image = tag.tags.picture;
    //console.log(image);
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
        {
            changeArt("imgs/cover_art/unknownArt.jpg");
        }
    }
}
