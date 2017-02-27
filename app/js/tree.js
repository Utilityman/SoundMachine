(function () {
  'use strict';

  let debugging = false;

  /**
      A tree with 4 levels and IDs on each branch
      Very customized for this project
  */
  let Tree = function (param, id) {
    this.item = param;
    this.branches = [];
    if (id !== undefined) {
      this.id = id;
    } else {
      this.id = -1;
    }
  };

  Tree.prototype.log = function () {
    if (debugging) {
      console.log('Artists: ');
      for (let i = 0; i < this.branches.length; i++) {
        console.log(this.branches[i].item);
        console.log('Albums: ');
        for (let j = 0; j < this.branches[i].branches.length; j++) {
          console.log(this.branches[i].branches[j].item);
          console.log('Songs: ');
          for (let k = 0; k < this.branches[i].branches[j].branches.length; k++) {
            console.log(this.branches[i].branches[j].branches[k].item);
          }
          console.log('--------');
        }
        console.log('============');
      }
    }
    console.log(this);
  };

  Tree.prototype.addAll = function (artist, album, song, path) {
    if (typeof path === 'undefined' || typeof path !== 'string') {
      return false;
    }
    if (typeof artist === 'undefined' || typeof artist !== 'string') {
      artist = 'Unknown';
    }
    if (typeof album === 'undefined' || typeof album !== 'string') {
      album = 'Unknown';
    }
    if (typeof song === 'undefined' || typeof song !== 'string') {
      if (path.includes('/')) {
        song = path.substring(path.lastIndexOf('/') + 1);
      } else {
        song = 'Unknown';
      }
    }
    let artistBranch;
    let albumBranch;
    let songBranch;

    artistBranch = contains(this.branches, artist);
    if (artistBranch)
      ;
    else {
      let artistTree = new Tree(artist, this.branches.length);
      this.branches.push(artistTree);
      artistBranch = artistTree;
    }

    albumBranch = contains(artistBranch.branches, album);
    if (albumBranch)
      ;
    else {
      let albumTree = new Tree(album, artistBranch.branches.length);
      artistBranch.branches.push(albumTree);
      albumBranch = albumTree;
    }

    songBranch = contains(albumBranch.branches, song);
    if (songBranch)
      ;
    else {
      let songTree = new Tree(song, albumBranch.branches.length);
      albumBranch.branches.push(songTree);
      songBranch = songTree;
    }

    if (contains(songBranch.branches, path))
      ;
    else {
      songBranch.branches.push(new Tree(path));
    }
    return true;
  };

  Tree.prototype.getAlbumsFromArtist = function (artistID) {
    if (typeof artistID === 'undefined' || typeof artistID !== 'number') {
      return null;
    }
    return this.branches[artistID].branches;
  };

  Tree.prototype.getSongsFromArtistAlbum = function (artistID, albumID) {
    if (typeof artistID === 'undefined' || typeof albumID === 'undefined' ||
        typeof artistID !== 'number' || typeof albumID !== 'number') return null;
    return this.branches[artistID].branches[albumID].branches;
  };

  Tree.prototype.getSongSecure = function (artistID, albumID, songID) {
    if (typeof artistID === 'undefined' || typeof artistID !== 'number' ||
       typeof albumID === 'undefined' || typeof albumID !== 'number' ||
       typeof songID === 'undefined' || typeof songID !== 'number' ||
       this.branches.length <= artistID ||
       this.branches[artistID].branches.length <= albumID ||
       this.branches[artistID].branches[albumID].branches.length <= songID) return null;
    return [this.branches[artistID].branches[albumID].branches[songID].branches[0].item,
      this.branches[artistID].item,
      this.branches[artistID].branches[albumID].item,
      this.branches[artistID].branches[albumID].branches[songID].item];
  };

  /**
   *  returns the artistID if artist already exists, returns -1 otherwise
   *  things should be uniquely named inside top layer braches so we
   *  shouldnt have a problem with lookup by name
   */
  Tree.prototype.getArtistID = function (artistName) {
    let containRet = contains(this.branches, artistName);
    return getID(containRet);
  };

  Tree.prototype.getAlbumID = function (artistID, albumName) {
    let containRet = contains(this.branches[artistID].branches, albumName);
    return getID(containRet);
  };

  Tree.prototype.getSongID = function (artistID, albumID, songName) {
    let containRet = contains(this.branches[artistID].branches[albumID].branches,
                              songName);
    return getID(containRet);
  };

  function getID (containsReturn) {
    if (!containsReturn) {
      return -1;
    } else {
      return containsReturn.id;
    }
  }

  Tree.prototype.containsArtist = function (artistName) {
    for (let i = 0; i < this.branches.length; i++) {
      if (this.branches[i].item === artistName) {
        return this.branches[i].id;
      }
    }
    return -1;
  };

  Tree.prototype.modifyArtistFromID = function (artistID, newItem) {
    this.branches[artistID].item = newItem;
  };

  Tree.prototype.containsAlbum = function (artistID, albumName) {
    for (let i = 0; i < this.branches[artistID].branches.length; i++) {
      if (this.branches[artistID].branches[i].item === albumName) {
        return this.branches[artistID].branches[i].id;
      }
    }
    return -1;
  };

  Tree.prototype.containsSong = function (artistID, albumID, songName) {
    let branch = this.branches[artistID].branches[albumID].branches;
    for (let i = 0; i < branch.length; i++) {
      if (branch[i].item === songName) {
        return branch[i].id;
      }
    }
    return -1;
  };

  Tree.prototype.modifyAlbumByID = function (artistID, albumID, newItem) {
    this.branches[artistID].branches[albumID].item = newItem;
  };

  function contains (list, obj) {
    let i = list.length;
    while (i--) {
      if (list[i].item === obj) {
        return list[i];
      }
    }
    return false;
  }

  module.exports = Tree;
}());
