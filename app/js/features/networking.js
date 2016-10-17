'use strict';

// Networking
var publicIp = require('public-ip');
var app = null;
var server = null;
var socket_io = null;
var broadcasting = false;
var room;
var users = [];

var Room = function()
{
    this.users = [];
    this.collection = null;
}

var User = function(userID)
{
    this.id = userID;
}

function toggleBroadcast()
{
    if(!broadcasting)
    {
        broadcasting = true;
        if($('#port').val() == '')
            $('#port').val('8989');
        //$('#port').removeClass('readonly');
        //$('#port').attr('readonly', !$('#port').attr('readonly'));

        publicIp.v4().then(ip => {
            $('#ip').val(ip);
        });
        app = require('express')();
        server = require('http').Server(app);
        socket_io = require('socket.io')(server);

        server.listen(8989, function()
        {
            console.log('Server is now running...');
        });

        socket_io.on('connection', function(socket)
        {
            console.log('User Connected!');
            socket.emit('socketID', { id: socket.id });
            socket.broadcast.emit('newUser', {id : socket.id});
        });
    }
    else
    {
        broadcasting = false;
        //$('#port').addClass('readonly');
        //$('#port').attr('readonly', !$('#port').attr('readonly'));
    }
}

function connect(hostname, port)
{
    room = require('socket.io-client')('http://' + hostname + ':' + port);
    console.log(room);

    room.on('connect', function () {
        console.log('Connected!');
    });
    room.on('socketID', function(data)
    {
        console.log(data);
    });
    room.on('connect_error', function() {
        console.log('Connection failed');
        room.io.reconnection(false);
    });
    room.on('reconnect_failed', function() {
        console.log('Reconnection failed');
    });
}
