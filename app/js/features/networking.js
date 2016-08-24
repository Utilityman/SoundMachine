
// Networking
var publicIp = require('public-ip');
var app = null;
var http = null;
var io = null;
var broadcasting = false;

function toggleBroadcast()
{
    if(!broadcasting)
    {
        broadcasting = true;
        if($('#port').val() == '')
            $('#port').val('8989');
        $('#port').removeClass('readonly');
        $('#port').attr('readonly', !$('#port').attr('readonly'));

        publicIp.v4().then(ip => {
            $('#ip').val(ip);
        });
    }
    else
    {
        broadcasting = false;
        $('#port').addClass('readonly');
        $('#port').attr('readonly', !$('#port').attr('readonly'));
    }
}
