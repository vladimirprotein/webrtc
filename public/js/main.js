'use strict';

var socket = io();

// storing the local html dom video elements in constants.
const localVideo = document.getElementById('localvideo');
const remoteVideo = document.getElementById('remotevideo');

let localStream;
let remoteStream;
var localPeerConnection;

const servers = {
    'iceServers': [
    {
      'url': 'stun:stun.l.google.com:19302'
    }
    // ,
    // {
    //   'url': 'turn:192.158.29.39:3478?transport=udp',
    //   'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    //   'username': '28224511:1379330808'
    // },
    // {
    //   'url': 'turn:192.158.29.39:3478?transport=tcp',
    //   'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    //   'username': '28224511:1379330808'
    // }
    ]
};

// storing button elements..
const callButton = document.getElementById('call');
const endButton = document.getElementById('end');
const usernameButton = document.getElementById('usernamesubmit');


// setting media stream constraints to pass as an argument to getUserMedia
// for local video element with no audio
const mediaStreamConstraintsL = {
	video:true,
	audio:false,
};
// for remote video element with audio
const mediaStreamConstraints = {
	video:true,
	audio:true,
};

// getting webcam stream for local video element
navigator.mediaDevices.getUserMedia(mediaStreamConstraintsL)
	.then(function(stream){
		localVideo.srcObject = stream;
	}).catch(handleLocalMediaStreamError);
trace('Requested stream for local video element. ');

// set localstream (with audio) for sending to other peer.
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
	.then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
trace('Requesting stream with audio for sending purpose.');


// callback for get local user media stream
function gotLocalMediaStream(stream) {
	//localVideo.srcObject = stream;
    localStream = stream;
    trace('localStream ready to send');
}
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
$('#usernamesubmit').click((e)=>{
	e.preventDefault();
	var username = $('#username').val();
	trace('setting username '+username);
	socket.emit('new user', {name: username}, (data)=>{
		//callback function definition..
		if(data == 'success'){
			$('#displayusername').html('username: '+ $('#username').val().toLowerCase().trim());
			$('#username').val('');
		}
		else{
			alert(data);
		}
	});
});



// bind click event on call button.. (function definition for call button)
$('#call').click((e)=>{
	e.preventDefault();
	var callee = $('#callee').val();
	socket.emit('call request', {callee: callee}, (data)=>{
		if(data == 'success'){
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

            socket.emit('call button clicked', {callee: callee});


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
        let callee = $('#callee').val();
        socket.emit('add ice candidate', {callee: callee, iceCandidate: JSON.stringify(newIceCandidate)});
        trace('INSIDE handleConnection');
    }
}
function handleConnection2(event){
	var iceCandidate = event.candidate;
	if(iceCandidate){
		const newIceCandidate = new RTCIceCandidate(iceCandidate);
		socket.emit('add ice candidate', {callee: window.caller, iceCandidate: JSON.stringify(newIceCandidate)});
	}
    trace('INSIDE handleConnection2');
}
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    // trace(`${getPeerName(peerConnection)} ICE state: ` +
    //  `${peerConnection.iceConnectionState}.`);
    trace('INSIDE handleConnectionChange');
}
function createdOffer(description){
	trace(`Offer from localPeerConnection:\n${description.sdp}`);
    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description);
    // .then(() => {
    //  	setLocalDescriptionSuccess(localPeerConnection);
    // }).catch(setSessionDescriptionError);
    // console.log(callee)
    let callee = $('#callee').val();

socket.emit('local description', {callee: callee, description: JSON.stringify(description)});
trace('INSIDE createdOffer');
}

function createdAnswer(description){
	//trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

   trace('remotePeerConnection setLocalDescription start.');
   localPeerConnection.setLocalDescription(description);
    // .then(() => {
    //   setLocalDescriptionSuccess(localPeerConnection);
    // }).catch(setSessionDescriptionError);

    socket.emit('answer', {caller: window.caller, description: JSON.stringify(description)});
    trace('INSIDE createdAnswer');
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
$('#end').click((e)=>{
	e.preventDefault();
	localVideo.srcObject = null;
	localPeerConnection.close();
	socket.emit
	trace('call ended');
})




socket.on('call button clicked', (obj)=>{
	window.caller2 = obj.caller;
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
  localPeerConnection.addEventListener('icecandidate', handleConnection2);
  localPeerConnection.addEventListener(
     'iceconnectionstatechange', handleConnectionChange);
  localPeerConnection.addEventListener('addstream', gotRemoteMediaStream);

	// adding local stream to local peer connection..
	localPeerConnection.addStream(localStream);
	trace('Added local stream to localPeerConnection.');
	trace('localPeerConnection createOffer start.');

});


// create rtc peer connection object as local peer connection and add ice candidate..
socket.on('add ice candidate', (obj)=>{
   localPeerConnection.addIceCandidate(JSON.parse(obj.iceCandidate));
   trace('ADD ICE CANDIDATE EMITTED');
});

// setting remote description on call request..
socket.on('local description', (obj)=>{
	window.caller = obj.caller;
	localPeerConnection.setRemoteDescription(JSON.parse(obj.description))
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
  }).catch(setSessionDescriptionError);

    // create answer..
    trace('remotePeerConnection createAnswer start.');
    localPeerConnection.createAnswer()
    .then(createdAnswer)
    .catch(setSessionDescriptionError);
});

socket.on('answer', (obj)=>{
	trace('localPeerConnection setRemoteDescription start.');
   localPeerConnection.setRemoteDescription(JSON.parse(obj.description))
   .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
  }).catch(setSessionDescriptionError);
});





// Logs an action (text) and the time when it happened on the console.
function trace(text){
	text = text.trim();
	const now = (window.performance.now() / 1000).toFixed(3);
	console.log(now, text);
}