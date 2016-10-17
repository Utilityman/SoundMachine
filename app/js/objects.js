
var Collection = function()
{
    console.log("Collection Created");
    this.artists = [];
}

var Artist = function(artist)
{
    this.name = artist;
    console.log("Artist Created");
    this.albums = [];
}

var Album = function(album)
{
    this.name = album;
    this.songs = [];
}

var Song = function(path, title, artist, album)
{
    this.path = path;
    this.title = title;
    this.artist = artist;
    this.album = album;
}


Collection.prototype.insertArtist = function(artist)
{
    for(var i = 0; i < this.artists.length; i++)
    {
        if(this.artists[i].name == artist)
            return "artist already exists!";
    }
    this.artists.push(new Artist(artist));
    return "inserting artist";
}

Collection.prototype.insertAlbum = function(artist, album)
{
    for(var i = 0; i < this.artists.length; i++)
    {
        if(this.artists[i].name == artist)
        {
            return this.artists[i].insertAlbum(album);
        }
    }
    this.artists.push(new Artist(artist));
    this.artists[this.artists.length - 1].albums.push(new Album(album));
    return "inserting new artist and album";
}

Artist.prototype.insertAlbum = function(album)
{
    for(var i = 0; i < this.albums.length; i++)
    {
        if(this.albums[i].name == album)
            return "album exists!";
    }
    this.albums.push(new Album(album));
    return "inserted new album";
}
