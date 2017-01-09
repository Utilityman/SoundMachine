
// TODO: How to wrap this up as an independent module
var debugging = false;

/**
    A tree with 4 levels
    Very customized for this project
*/
var Tree = function(param, id)
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
        for(var i = 0; i < this.branches.length; i++)
        {
            console.log(this.branches[i].item);
            console.log("Albums: ");
            for(var j = 0; j < this.branches[i].branches.length; j++)
            {
                console.log(this.branches[i].branches[j].item);
                console.log("Songs: ");
                for(var k = 0; k < this.branches[i].branches[j].branches.length; k++)
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
    var firstLevel;
    var secondLevel;
    var thirdLevel;
    if(firstLevel = contains(this.branches, artist))
        ;
    else
    {
        var artistTree = new Tree(artist, this.branches.length);
        this.branches.push(artistTree);
        firstLevel = artistTree;
    }
    if(secondLevel = contains(firstLevel.branches, album))
        ;
    else
    {
        var albumTree = new Tree(album, firstLevel.branches.length);
        firstLevel.branches.push(albumTree);
        secondLevel = albumTree;
    }
    if(thirdLevel = contains(secondLevel.branches, song))
        ;
    else
    {
        var songTree = new Tree(song, secondLevel.branches.length);
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

/**
 *  Gets the items from the id's branches
 *  note: the order of this function depends on the depth of the id
 *  @param {string} id - the name of the item of the tree you're looking for
 *  @param {int} level - the expected level of the items
 *              1 -- Match Artist (returns $[albums])
 *              2 -- Match Album (returns $[songs])
 *              3 -- Match Songs (returns [path, artist, album, title])
 *  @return {array} a collection of items that belong to the id
 */
Tree.prototype.get = function(id, level)
{
    var tree = this.branches;
    var collection = [];
    // for all of the artists
    for(var i = 0; i < tree.length; i++)
    {
        // if an artist matches the id
        if(tree[i].item == id && level == 1)
        {
            // get all of their albums
            collection = getBranchItems(tree[i].branches);
            if(debugging)console.log(collection);
            break;
        }
        // for all of the albums
        for(var j = 0; j < tree[i].branches.length; j++)
        {
            // if the album matches the id
            if(tree[i].branches[j].item == id && level == 2)
            {
                // get all of that albums songs
                collection = getBranchItems(tree[i].branches[j].branches);
                if(debugging)console.log(collection);
                break;
            }
            // for all of the songs
            for(var k = 0; k < tree[i].branches[j].branches.length; k++)
            {
                // if the song matches
                if(tree[i].branches[j].branches[k].item == id && level == 3)
                {
                    collection = getBranchItems(tree[i].branches[j].branches[k].branches);
                    collection.push(tree[i].item);
                    collection.push(tree[i].branches[j].item);
                    collection.push(tree[i].branches[j].branches[k].item);
                    if(debugging)console.log(collection);
                    break;
                }
            }
        }
    }
    return collection;
}

Tree.prototype.getAlbumsFromArtist = function(artistID)
{
//    var tree = this.branches;
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

/**
 *  Gets the items off of a certain branch.
 */
 function getBranchItems(branches)
 {
     var collection = [];
     for(var i =0; i < branches.length; i++)
     {
         collection.push(branches[i].item);
     }
     return collection;
 }

function contains(list, obj)
{
    var i = list.length;
    while(i--)
    {
        if(list[i].item === obj)
            return list[i];
    }
    return false;
}
