/* global $ jukebox Jukebox */
'use strict';

/*
 *  This file is essentially the main of the rendering process.
 *  Currently it really doesn't do that much but it should be made
 *  to hold an event controller to run everything.
 *  TODO: A lot of things with eslint-disable-line should be reevaluated
 */

let SETTING_ELE_COUNT = 0;  //eslint-disable-line

// Electron and Config Stuffs
let {ipcRenderer} = require('electron');
let fs = require('fs');     //eslint-disable-line
let path = require('path');
let config = require(path.join(__dirname, '/data/config.json'));  //eslint-disable-line

// Window letiables
let miniplayer = false;
// let miniplayerElementIndex = 0;
let col1Width = 350;

$(document).ready(function () {
  SETTING_ELE_COUNT = $('#resourceTree').children().length;

  $('#roomName').change(function () {
    console.log($('#roomName').val());
    $('#your-channel').text($('#roomName').val());
  });

  // Switch channels
  $('.channel').mousedown(function (event) {
    if (event.which === 3) {
      console.log('RIGHT CLICK');
      // alert("Right Click - channel options");
    }
    if (event.which === 1) {
      console.log('LEFT CLICK');
      // alert("Left Click - Change Channel")
    }
  });
  $.notify.defaults(
    {
      className: 'info',
      autoHideDelay: 1500
    });
  $.notify.addStyle('metadata',
    {
      html:
      '<div class="dont-close">' +
          '<div class="clearfix dont-close">' +
              '<div class="input dont-close">' +
                  '<label class="dont-close" onclick="submitMetadata()">' +
                  '&check;</label>' +
                  '<input class="dont-close metadataEntry" type="text">' +
              '</div>' +
      '</div>'
    });
  startup();
});

$(document).bind('mousedown', function (e) {
  // TODO: get rid of hasClass 'contextMenu' in favor of the aptly named dont-close
  if (e.which === 1 && !($(e.target).hasClass('contextMenu')) &&
          !($(e.target).hasClass('dont-close'))) {
    console.log('BLAM!');
    $('.contextContents').addClass('hidden');
    $('.selected').removeClass('selected');
    $('.notifyjs-wrapper').trigger('notify-hide');
  }
  // if its a right click we can still hide the notifications
  if (e.which === 3) {
    $('.notifyjs-wrapper').trigger('notify-hide');
  }
});

/**
 *  Function that runs on startup. This function will load
 *  the music library that is found in the app/res/ directory.
 */
function startup () {
  // TODO: eslint-disable-line are workarounds for bad implementations
  jukebox = new Jukebox();  //eslint-disable-line
  loadFromManifest();        //eslint-disable-line
  $('#library').css('display', 'block');
  resizeWindow();
}

/**
 *  Opens a tab selected from the tab menu
 */
function openTab (ele, tabName) { // eslint-disable-line
                                  // this is used in HTML elements
  $('.tabcontent').css('display', 'none');
  $('.tablinks').removeClass('active');
  $('#' + tabName).css('display', 'block');
  $(ele).addClass('active');
}

function addChannel () {  // eslint-disable-line
                          // this is used in HTML elements
  // alert('Which Channel To Add?');
}

/**
 *  Appropriately manages the resizing of the window.
 *  This function will also convert the player into the miniplayer
 *  when resized to the minimum height
 */
function resizeWindow () {
  // console.log($(window).width() + " " + $(window).height());
  $('#channelUsers').height($(window).height());
  $('#nowPlaying').height($(window).height());
  $('#col2').height($(window).height());
  $('#col2').width($(window).width() - col1Width);
  $('#chatbox').width($(window).width() - 550);
  $('#chatbox').height($(window).height() - 150);
  $('#library').height($(window).height() - 60);
  $('#settings').height($(window).height() - 60);
  $('#input').width($(window).width() - 540);
  $('#playListPanel').height($(window).height() - 502);
  $('#playListScroll').height($(window).height() - 502);
  $('#libraryScroll').height($(window).height() - 60);

  if ($(window).height() === 28) {
    miniplayer = true;
    convertToMiniplayer();
  } else if (miniplayer) {
    miniplayer = false;
    convertFromMiniplayer();
  }
}

/* TODO: Work on the miniplayer CSS */
function convertToMiniplayer () {
    // let channelInfo = $(".channel.active span");
    // channelInfo.css("height", "28px");
    // channelInfo.css("background", "gray");
    // channelInfo.css("max-width", "100%");
    // channelInfo.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
    // function() {
    //    channelInfo.parent().css("margin-right", channelInfo.width() + 16);
    // });
}

function convertFromMiniplayer () {
    // $(".channel.active").children().css("padding", "0");
    // $(".channel.active").children().css("max-width", "0");
    // $(".channel.active").css("margin-right", 0);
}

function closeWindow () {  // eslint-disable-line
                          // this is used in HTML elements
  ipcRenderer.send('quit', '');
}

function minimizeWindow () { // eslint-disable-line
                            // this is used in HTML elements
  ipcRenderer.send('minimize', '');
}

function toggleOntop () {  // eslint-disable-line
                          // this is used in HTML elements
  ipcRenderer.send('toggleTop', '');
}

function toggleWebTools () {  // eslint-disable-line
                              // this is used in HTML elements
  ipcRenderer.send('toggleTools', '');
}

function toggleWindow () {  // eslint-disable-line
                            // this is used in HTML elements
  ipcRenderer.send('toggleWindow', 'finished-loading');
}

function sendProgress (current) {  // eslint-disable-line
                                   // this is used in HTML elements
  ipcRenderer.send('loading', current);
}

function setArt (mode) {  // eslint-disable-line
                          // this is used in HTML elements
  jukebox.setArt(mode);
}

ipcRenderer.on('unfocus', (event, args) => {
  $('.contextContents').addClass('hidden');
});
