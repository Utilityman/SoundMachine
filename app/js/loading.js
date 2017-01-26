/* global $ */
'use strict';

let ProgressBar = require('progressbar.js');
let {ipcRenderer} = require('electron');

let maxVal = 0;
let circle;

$(document).ready(function () {
  initLoading();
});

function initLoading () {
  let absoluteEle = $('#absolutely');
  circle = new ProgressBar.Circle('#progress', {
    strokeWidth: 4,
    trailWidth: 5,
    color: '#FFFFFF',
    duration: 0,
    trailColor: '#6F6F75',
    from: {color: '#FFFFFF', a: 0},
    to: {color: '#000000', a: 1},
    step: function (state, circle) {
      circle.path.setAttribute('stroke', state.color);
      absoluteEle.css('color', state.color);
    }
  });
  circle.set(1);
}

ipcRenderer.on('progress', function (event, data) {
  if (data.prog > maxVal) {
    maxVal = data.prog;
  }
  circle.set(data.prog / maxVal);
});
