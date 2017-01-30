
(function () {
  'use strict';
  let assert = require('assert');
  let chai = require('chai');
  chai.should();

  //require('../app/js/features/library.js');

  describe('Array', function() {
    describe('#indexOf()', function() {
      it('should return -1 when the value is not present', function() {
        assert.equal(-1, [1,2,3].indexOf(4));
      });
      it('should return 0 which is where 1 is stored', function() {
        assert.equal(0, [1,2,3].indexOf(1));
      });
    });
  });
}());
