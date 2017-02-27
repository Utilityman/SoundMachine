/* global describe it */

(function () {
  'use strict';

  // var assert = require('assert');
  var Tree = require('../app/js/tree.js');
  let chai = require('chai');
  chai.should();

  let tree = new Tree();

  describe('Tree', function () {
    describe('#root properties', function () {
      it('root to have an id of -1', function () {
        tree.id.should.be.equal(-1);
      });
      it('no branches when initialized', function () {
        tree.branches.should.be.empty;
      });
    });

    describe('#addAll():base', function () {
      it('ability to contain a branch after appending to', function () {
        tree.addAll('TestArtist0',
                    'TestAlbum0',
                    'TestSong0',
                    'TestArtist0_TestAlbum0_TestSong0').should.be.true;
        tree.branches.should.not.be.empty;
      });
      it('ability to handle multiple branches', function () {
        tree.addAll('TestArtist1',
                    'TestAlbum1',
                    'TestSong1',
                    'TestArtist1_TestAlbum1_TestSong1').should.be.true;
        tree.addAll('TestArtist2',
                    'TestAlbum2',
                    'TestSong2',
                    'TestArtist2_TestAlbum2_TestSong2').should.be.true;
        tree.branches.length.should.be.above(1);
      });
    }); // #addAll():base

    describe('#addAll():duplicates', function () {
      it('duplicate artiss will not be added under root', function () {
        let compareLength = tree.branches.length;
        tree.addAll('TestArtist0',
                    'TestAlbum1',
                    'TestSong0',
                    'TestArtist0_TestAlbum1_TestSong0').should.be.true;
        tree.branches.should.have.length(compareLength);
      });
      it('duplicate albums will not be added under single artist', function () {
        let compareLength = tree.branches[0].branches.length;
        tree.addAll('TestArtist0',
                      'TestAlbum1',
                      'TestSong1',
                      'TestArtist0_TestAlbum1_TestSong1').should.be.true;
        tree.branches[0].branches.should.have.length(compareLength);
      });
      it('duplicate songs will not be added', function () {
        let compareLength = tree.branches[0].branches[1].branches.length;
        tree.addAll('TestArtist0', 'TestAlbum1', 'TestSong0',
                    'TestArtist0_TestAlbum1_TestSong0').should.be.true;
        tree.branches[0].branches[1].branches.should.have.length(compareLength);
      });
    }); // #addAll():duplicates

    describe('#addAll():id_assignment', function () {
      it('unique ids for its artists', function () {
        let ids = [];
        tree.branches.length.should.be.above(1);

        tree.branches.forEach(function (element) {
          ids.should.not.includes(element.id);
          ids.push(element.id);
        });
      });
      it('unique ids for its albums', function () {
        let ids = [];
        tree.branches[0].branches.length.should.be.above(1);

        tree.branches[0].branches.forEach(function (element) {
          ids.should.not.include(element.id);
          ids.push(element.id);
        });
      });
      it('unique ids for its songs', function () {
        let ids = [];
        tree.branches[0].branches[1].branches.length.should.be.above(1);

        tree.branches[0].branches[1].branches.forEach(function (element) {
          ids.should.not.include(element.id);
          ids.push(element.id);
        });
      });
    }); // #addAll():id_assignment
    describe('#addAll():error_handling', function () {
      it('no parameters should return false', function () {
        tree.addAll().should.be.false;
      });
      it('omitted path should return false', function () {
        tree.addAll('This', 'Returns', 'False').should.be.false;
      });
      it('incorrectly typed path returns false', function () {
        tree.addAll('This', 'Returns', 'False', 42).should.be.false;
      });
      it('incorrectly typed album/artist/song renames to Unknown', function () {
        tree.addAll(42, 23, 24, 'path').should.be.true;
        let artist = false;
        let album = false;
        let song = false;
        tree.branches.forEach(function (element) {
          if (element.item === 'Unknown') {
            artist = true;
          }
          element.branches.forEach(function (element2) {
            if (element2.item === 'Unknown') {
              album = true;
            }
            element2.branches.forEach(function (element3) {
              if (element3.item === 'Unknown') {
                song = true;
              }
            });
          });
        });
        artist.should.be.true;
        album.should.be.true;
        song.should.be.true;
      });
    }); // #addAll():error_handling

    describe('#getAlbumsFromArtist():all', function () {
      it('retrieve albums from artist id', function () {
        tree.getAlbumsFromArtist(0).should.equal(tree.branches[0].branches);
      });
      it('undefined parameter returns null', function () {
        (tree.getAlbumsFromArtist() === null).should.be.true;
      });
      it('incorrectly typed parameter returns null', function () {
        (tree.getAlbumsFromArtist('bad') === null).should.be.true;
      });
    }); // #getAlbumsFromArtist():all

    describe('#getSongsFromArtistAlbum():all', function () {
      it('retrieve songs from artist and album ids', function () {
        tree.getSongsFromArtistAlbum(0, 0).should.equal(tree.branches[0].branches[0].branches);
      });
      it('undefined parameters returns null', function () {
        (tree.getSongsFromArtistAlbum() === null).should.be.true;
        (tree.getSongsFromArtistAlbum(0) === null).should.be.true;
      });
      it('incorrectly typed parameters returns null', function () {
        (tree.getSongsFromArtistAlbum('no', 'bueno') === null).should.be.true;
        (tree.getSongsFromArtistAlbum('bad') === null).should.be.true;
      });
    }); // #getSongsFromARtistAlbum():all

    describe('#getSongSecure():all', function () {
      it('retrieve all information by 3 keys', function () {
        let song = tree.getSongSecure(0, 0, 0);
        song.should.have.length(4);
        song[0].should.equal(tree.branches[0].branches[0].branches[0].branches[0].item);
        song[1].should.equal(tree.branches[0].item);
        song[2].should.equal(tree.branches[0].branches[0].item);
        song[3].should.equal(tree.branches[0].branches[0].branches[0].item);
      });
      it('undefined parameters returns null', function () {
        (tree.getSongSecure() === null).should.be.true;
      });
      it('incorrectly typed parameters returns null', function () {
        (tree.getSongSecure('1', '1', '1') === null).should.be.true;
      });
      it('id out of bounds returns null', function () {
        let HUGE_NUMBER = 9999;
        tree.getSongSecure(HUGE_NUMBER, HUGE_NUMBER, HUGE_NUMBER);
      });
    }); // #getSongSecure():all

    describe('#getArtistID():all', function () {
      it('retrieve artistID by name', function () {
        let artistName0 = 'TestArtist0';
        let artistID0 = tree.getArtistID(artistName0);
        tree.branches[artistID0].item.should.equal(artistName0);

        let artistName1 = 'TestArtist1';
        let artistID1 = tree.getArtistID(artistName1);
        tree.branches[artistID1].item.should.equal(artistName1);
      });
    });
  }); // Tree
}());
