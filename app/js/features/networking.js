/* global $ jukebox collection */
'use strict';

// Networking
let publicIp = require('public-ip');
let app = null;
let server = null;
let io = null;
let broadcasting = false;
let room;
let connectedCollections = []; // eslint-disable-line

// TODO: Keep track of users and their ids

let Room = function () {
  this.users = [];
  this.password = '';
  this.collection = null;
};

let User = function (id, username) {
  this.id = id;
  this.name = username;
};

function toggleBroadcast () {  // eslint-disable-line
                               // this is used in HTML elements
  if (!broadcasting) {
    broadcasting = true;

    if ($('#port').val() === '') {
      $('#port').val('8989');
    }
    // $('#port').removeClass('readonly');
    // $('#port').attr('readonly', !$('#port').attr('readonly'));

    publicIp.v4().then(ip => {
      $('#ip').val(ip);
    });
    app = require('express')();
    server = require('http').Server(app);
    io = require('socket.io')(server);

    server.listen(8989, function () {
      console.log('Server is now running...');
    });

    room = new Room();
    io.on('connection', function (socket) {
      console.log('User Connected!');
      $.notify('User Connected!');  // TODO: Put username in notification
      socket.emit('verificationRequest');
      // socket.broadcast.emit('newUser', {id : socket.id});

      socket.on('userVerification', function (data) {
        room.users.push(new User(socket.id, data.username));
        let newRow = $('<tr class="active hidden"><td>' +
                       data.username + '</td></tr>');

        $('#userTable tr:last').after(newRow);
        newRow.fadeIn(750);
        socket.emit('serverInformation', {
          serverName: $('#roomName').val(),
          library: collection,
          playlist: jukebox.playlist,
          socketID: socket.id
        });
      });
      socket.on('disconnect', function () {
        console.log('User Disconnected');
        // TODO: Send socket.id to all other users
      });
    });
  } else {
    broadcasting = false;
    // TODO: toogle off.
    //      - disconnect users (preferably with message)
    //      - close/end connection
    //      - change css to normal view
    // $('#port').addClass('readonly');
    // $('#port').attr('readonly', !$('#port').attr('readonly'));
  }
}

function connect (hostname, port, username, password) {  // eslint-disable-line
                                                         // this is used in HTML elements
  if (!username) username = 'Nomy';
  if (!password) password = 'TMP_EMPTY_PASS';
  room = require('socket.io-client')('http://' + hostname + ':' + port);
  console.log(room);

  room.on('connect', function () {
    console.log('Connected!');
    $.notify('Connected To Server!', 'success');
  });
  room.on('socketID', function (data) {
    console.log(data);
  });
  room.on('connect_error', function () {
    console.log('Connection failed');
    room.io.reconnection(false);
  });
  room.on('reconnect_failed', function () {
    console.log('Reconnection failed');
    room.io.reconnection(false);
  });
  room.on('newUser', function (data) {
    console.log('Reading New User!');
  });
  room.on('verificationRequest', function () {
    room.emit('userVerification', {username: username, password: password});
  });
  room.on('serverInformation', function (data) {
    console.log(data);
  });
  room.on('tick', function (data) {
    console.log(data);
  });
}
