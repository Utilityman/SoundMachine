var debugging = false;

/**
    A tree with 3 levels
*/
var Tree = function(param)
{
    if(param == undefined) if(debugging) console.log("tree created");
    else if(debugging) console.log("tree created with item: " + param);
    this.item = param;
    this.branches = [];
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
}

Tree.prototype.addAll = function(artist, album, song)
{
    var firstLevel;
    var secondLevel;
    var thirdLevel;
    if(firstLevel = contains(this.branches, artist))
        ;
    else
    {
        var artistTree = new Tree(artist);
        this.branches.push(artistTree);
        firstLevel = artistTree;
    }
    if(secondLevel = contains(firstLevel.branches, album))
        ;
    else
    {
        var albumTree = new Tree(album);
        firstLevel.branches.push(albumTree);
        secondLevel = albumTree;
    }
    if(contains(secondLevel.branches, song))
        ;
    else
    {
        secondLevel.branches.push(new Tree(song));
    }

    //console.log(this);


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
