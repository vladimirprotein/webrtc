const express = require('express');
const https = require('https');
const fs = require('fs');
var app = express();
var options = {
key: fs.readFileSync('/selfsigned.key'),
cert: fs.readFileSync('/selfsigned.crt')
};
var server = https.createServer(options, app);
var io = require('socket.io')(server);
var users = {};
app.use(express.static('public'));


// serving index.html on request to homepage..
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// listening on port 3000..
server.listen(3000, function(){
  console.log('listening on *:3000');
});

// handling connection event..
io.on('connection', (socket)=>{

	socket.on('call button clicked', (obj)=>{
		console.log('call button clicked emitted by: '+socket.username+' to: '+obj.callee);
		users[obj.callee].emit('call button clicked', {caller: socket.username});
	})

	socket.on('new user', (obj, callback)=>{
		obj.name = obj.name.toLowerCase().trim();
		if(socket.username){
			callback('You already have a username: '+ socket.username);
			return;
		}
		if(obj.name == ''){
			callback('Where have you seen an empty username?');
			return;
		}
		if(obj.name in users){
			callback('Be Unique.. This one already exists');
			return;
		}
		socket.username = obj.name;
		users[obj.name] = socket;
		console.log(socket.username+' joined..');
		callback('success');
		io.emit('users online', Object.keys(users));
	});

	socket.on('call request', (obj, callback)=>{
		console.log('call request emmitted by: '+socket.username+' to: '+obj.callee);
		if(!(socket.username in users)){
			callback('Get a username first..');
			return;
		}
		if(!(obj.callee in users)){
			callback('This user does not exist');
			return;
		}
		callback('success');
	});

	socket.on('add ice candidate', (obj)=>{
		console.log('add ice candidate emmitted by: '+socket.username+' to: '+obj.callee);
		var soc = users[obj.callee];
		soc.emit('add ice candidate', {iceCandidate: obj.iceCandidate});
	});

	socket.on('local description', (obj)=>{
		console.log('local description emmitted by: '+socket.username+' to: '+obj.callee);
		var soc1 = users[obj.callee];
		soc1.emit('local description', {caller: socket.username, description: obj.description});
	});

	socket.on('answer', (obj)=>{
		console.log('answer emmitted by: '+socket.username+' to: '+obj.caller);
		soc2 = users[obj.caller];
		soc2.emit('answer', {description: obj.description});
	});
});