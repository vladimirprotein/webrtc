'use strict';

var socket = io();

// storing the local html dom video elements in constants.
const localVideo = document.getElementById('localvideo');
const remoteVideo = document.getElementById('remotevideo');

const usernameInput = document.getElementById('username');
const calleeInput = document.getElementById('callee');
const displayUsername = document.getElementById('displayusername');

let localStream;
let remoteStream;
var localPeerConnection;

const servers = {
    'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302'
    }
    ]
};

// storing button elements..
const callButton = document.getElementById('call');
const endButton = document.getElementById('end');
const usernameButton = document.getElementById('usernamesubmit');

// media stream constraints for both local preview and sending
const mediaStreamConstraints = {
	video: true,
	audio: true,
};

// Single getUserMedia call for both preview and sending
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
	.then(function(stream){
		localVideo.srcObject = stream;
		localStream = stream;
		trace('Local media stream ready.');
	}).catch(handleLocalMediaStreamError);
trace('Requested local media stream with audio.');

// error handling function for getting local media stream..
function handleLocalMediaStreamError(error) {
    trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
}

// bind click event on set username button.. (function definition for setting username)
usernameButton.addEventListener('click', (e)=>{
	e.preventDefault();
	var username = usernameInput.value;
	trace('setting username '+username);
	socket.emit('new user', {name: username}, (data)=>{
		//callback function definition..
		if(data == 'success'){
			displayUsername.textContent = 'username: ' + usernameInput.value.toLowerCase().trim();
			window.myend = usernameInput.value.toLowerCase().trim();
			usernameInput.value = '';
		}
		else{
			alert(data);
		}
	});
});

// bind click event on call button.. (function definition for call button)
callButton.addEventListener('click', (e)=>{
	e.preventDefault();
	var callee = calleeInput.value.toLowerCase().trim();
	socket.emit('call request', {callee: callee}, (data)=>{
		if(data == 'success'){
			window.otherend = callee;
			trace('Starting call.');
            var startTime = window.performance.now();

  			//Get local media stream tracks.
            const videoTracks = localStream.getVideoTracks();
            const audioTracks = localStream.getAudioTracks();
            if (videoTracks.length > 0) {
               trace(`Using video device: ${videoTracks[0].label}.`);
            }
            if (audioTracks.length > 0) {
               trace(`Using audio device: ${audioTracks[0].label}.`);
            }

  			// Create peer connections and add behavior.
  			localPeerConnection = new RTCPeerConnection(servers);
  			trace('Created local peer connection object localPeerConnection.');
  			localPeerConnection.addEventListener('icecandidate', handleConnection);
  			localPeerConnection.addEventListener(
                  'iceconnectionstatechange', handleConnectionChange);
            localPeerConnection.addEventListener('addstream', gotRemoteMediaStream);

            socket.emit('call button clicked', {callee: window.otherend});

    		// adding local stream to local peer connection..
    		localPeerConnection.addStream(localStream);
    		trace('Added local stream to localPeerConnection.');

  			// setting offer options..
  			const offerOptions = {
  				offerToReceiveVideo: 1,
  				offerToReceiveAudio: 1,
            };
            // creating offer with local peer conection..
            trace('localPeerConnection createOffer starting.');
            localPeerConnection.createOffer(offerOptions)
            .then(createdOffer).catch(setSessionDescriptionError);
        }
        else{
            alert(data);
        }
    });
});

function handleConnection(event){
	var iceCandidate = event.candidate;
	if(iceCandidate){
		const newIceCandidate = new RTCIceCandidate(iceCandidate);
        socket.emit('add ice candidate', {callee: window.otherend, iceCandidate: JSON.stringify(newIceCandidate)});
        //trace('INSIDE handleConnection');
    }
}

function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace('INSIDE handleConnectionChange');
}
function createdOffer(description){
	trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description);

    socket.emit('local description', {callee: window.otherend, description: JSON.stringify(description)});
    trace('Offer created from my side..');
}

function createdAnswer(description){
   trace('Setting my local description..');
   localPeerConnection.setLocalDescription(description);

    socket.emit('answer', {caller: window.otherend, description: JSON.stringify(description)});
    trace('Sent my description to the caller..');
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}
// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} complete.`);
}
// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}
// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}
// bind click event on end button.. (function definition for end button)
endButton.addEventListener('click', (e)=>{
	e.preventDefault();
	remoteVideo.srcObject = null;
	localPeerConnection.close();
	socket.emit('call ended', {to: window.otherend});
	trace('call ended from my side');
	alert('Call Ended..')
})




socket.on('call button clicked', (obj)=>{
	window.otherend = obj.caller;
	trace('Starting call.');
	var startTime = window.performance.now();

	// Get local media stream tracks.
  	const videoTracks = localStream.getVideoTracks();
  	const audioTracks = localStream.getAudioTracks();
  	if (videoTracks.length > 0) {
     	trace(`Using video device: ${videoTracks[0].label}.`);
 	}
 	if (audioTracks.length > 0) {
    	trace(`Using audio device: ${audioTracks[0].label}.`);
 	}

	// Create peer connections and add behavior.
	localPeerConnection = new RTCPeerConnection(servers);
  	trace('LOCAL PEER CONNECTION::::'+localPeerConnection);
  	localPeerConnection.addEventListener('icecandidate', handleConnection);
  	localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
  	localPeerConnection.addEventListener('addstream', gotRemoteMediaStream);

	// adding local stream to local peer connection..
	localPeerConnection.addStream(localStream);
	trace('Added local stream to localPeerConnection.');

});


// create rtc peer connection object as local peer connection and add ice candidate..
socket.on('add ice candidate', (obj)=>{
   localPeerConnection.addIceCandidate(JSON.parse(obj.iceCandidate));
   trace('ADD ICE CANDIDATE EMITTED');
});

// setting remote description on call request..
socket.on('local description', (obj)=>{
	trace('Description received. Setting it as remote description..')
	localPeerConnection.setRemoteDescription(JSON.parse(obj.description))
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
  }).catch(setSessionDescriptionError);

    // create answer..
    trace('Creating answer..');
    localPeerConnection.createAnswer()
    .then(createdAnswer)
    .catch(setSessionDescriptionError);
});

socket.on('answer', (obj)=>{
	trace('Received description of the callee..');
   	localPeerConnection.setRemoteDescription(JSON.parse(obj.description))
   	.then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
  	}).catch(setSessionDescriptionError);
  	trace('Set my remote description with the callee description..')
});

socket.on('call ended', (obj)=>{
	trace('Other user ended the call..');
	remoteVideo.srcObject = null;
	localPeerConnection.close();
	alert('Other user ended the call');
})

// Logs an action (text) and the time when it happened on the console.
function trace(text){
	text = text.trim();
	const now = (window.performance.now() / 1000).toFixed(3);
	console.log(now, text);
}