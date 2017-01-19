
// TODO: How to wrap this up as an independent module
let debugging = false;

/**
    A tree with 4 levels
    Very customized for this project
*/
let Tree = function(param, id)
{
    if(param === undefined) if(debugging) console.log("tree created");
    else if(debugging) console.log("tree created with item: " + param);
    this.item = param;
    this.branches = [];
    if(id !== undefined)
        this.id = id;
    else
        this.id = -1;
}

Tree.prototype.log = function()
{
    if(debugging)
    {
        console.log("Artists: ");
        for(let i = 0; i < this.branches.length; i++)
        {
            console.log(this.branches[i].item);
            console.log("Albums: ");
            for(let j = 0; j < this.branches[i].branches.length; j++)
            {
                console.log(this.branches[i].branches[j].item);
                console.log("Songs: ");
                for(let k = 0; k < this.branches[i].branches[j].branches.length; k++)
                {
                    console.log(this.branches[i].branches[j].branches[k].item);
                }
                console.log("--------");
            }
            console.log("============");
        }
    }
    console.log(this);
}

Tree.prototype.addAll = function(artist, album, song, path)
{
    if(artist === undefined)
        artist = "Unknown";
    if(album === undefined)
        album = "Unknown";
    if(song === undefined)
        song = path.substring(path.lastIndexOf('/')+1);
    let firstLevel;
    let secondLevel;
    let thirdLevel;
    if(firstLevel = contains(this.branches, artist))
        ;
    else
    {
        let artistTree = new Tree(artist, this.branches.length);
        this.branches.push(artistTree);
        firstLevel = artistTree;
    }
    if(secondLevel = contains(firstLevel.branches, album))
        ;
    else
    {
        let albumTree = new Tree(album, firstLevel.branches.length);
        firstLevel.branches.push(albumTree);
        secondLevel = albumTree;
    }
    if(thirdLevel = contains(secondLevel.branches, song))
        ;
    else
    {
        let songTree = new Tree(song, secondLevel.branches.length);
        secondLevel.branches.push(songTree);
        thirdLevel = songTree;
    }
    if(contains(thirdLevel.branches, path))
        ;
    else
    {
        thirdLevel.branches.push(new Tree(path));
    }
}

Tree.prototype.getAlbumsFromArtist = function(artistID)
{
//    let tree = this.branches;
    return this.branches[artistID].branches;
}

Tree.prototype.getSongsFromArtistAlbum = function(artistID, albumID)
{
    if(typeof artistID === "undefined" ||
       typeof albumID === "undefined") return;
    return this.branches[artistID].branches[albumID].branches;
}

Tree.prototype.getSongSecure = function(artistID, albumID, songID)
{
    return [this.branches[artistID].branches[albumID].branches[songID].branches[0].item,
        this.branches[artistID].item,
        this.branches[artistID].branches[albumID].item,
        this.branches[artistID].branches[albumID].branches[songID].item];
}

Tree.prototype.addNewArtist = function(newArtistName)
{
    let newID = this.branches.length;
    let newArtistTree = new Tree(newArtistName, newID);
    this.branches.push(newArtistTree);
    return newID;
}

Tree.prototype.addNewAlbum = function(artistID, newAlbumName)
{
    let newID = this.branches[artistID].branches.length;
    let newAlbumTree = new Tree(newAlbumName, newID);
    this.branches[artistID].branches.push(newAlbumTree);
    return newID;
}

Tree.prototype.addNewSong = function(artistID, albumID, newSongName)
{
    let newID = this.branches[artistID].branches[albumID].branches.length;
    let newSongTree = new Tree(newSongName, newID);
    this.branches[artistID].branches[albumID].branches.push(newSongTree);
    return newID;
}

Tree.prototype.assignPathToUnassigned = function(artistID, albumID, songID, pathBranch)
{
    if(!Tree.prototype.isPrototypeOf(pathBranch[0]) &&
        pathBranch[0].id === -1)
        return false; // Invalid pathBranch - simple verification
    this.branches[artistID].branches[albumID].branches[songID].branches = pathBranch;
    return true;
}

Tree.prototype.containsArtist = function(artistName)
{
    for(let i = 0; i < this.branches.length; i++)
    {
        if(this.branches[i].item === artistName)
            return this.branches[i].id;
    }
    return -1;
}

Tree.prototype.modifyArtistFromID = function(artistID, newItem)
{
    this.branches[artistID].item = newItem;
}

Tree.prototype.containsAlbum = function(artistID, albumName)
{
    for(let i = 0; i < this.branches[artistID].branches.length; i++)
    {
        if(this.branches[artistID].branches[i].item === albumName)
            return this.branches[artistID].branches[i].id;
    }
    return -1;
}

Tree.prototype.containsSong = function(artistID, albumID, songName)
{
  let branch = this.branches[artistID].branches[albumID].branches;
  for(let i = 0; i < branch.length; i++)
  {
    if(branch[i].item === songName)
      return branch[i].id;
  }
  return -1;
}

Tree.prototype.modifyAlbumByID = function(artistID, albumID, newItem)
{
    this.branches[artistID].branches[albumID].item = newItem;
}

/**
 *  Gets the items off of a certain branch.
 */
 function getBranchItems(branches)
 {
     let collection = [];
     for(let i =0; i < branches.length; i++)
     {
         collection.push(branches[i].item);
     }
     return collection;
 }

function contains(list, obj)
{
    let i = list.length;
    while(i--)
    {
        if(list[i].item === obj)
            return list[i];
    }
    return false;
}
