var minePlayer
var roomId
var parent
var joinButtom
var localStream
var remoteStreams = []
var localDescription
var roomID
var isHost = false
var websocket = new WebSocket('wss://77485217.ngrok.io')

let iceServers = {iceServers:[
    {
        urls: ["turn:13.250.13.83:3478?transport=udp"],
        credential: "YzYNCouZM1mhqhmseWk6",
        username: "YzYNCouZM1mhqhmseWk6"
    },
    {
        urls: ['stun:stun1.l.google.com:19302']
    }
]}

var eventEmiter = new EventEmitter()
var peerConnections = {}
var participantID

eventEmiter.on('roomFull', (payload)=>{
    alert('roomFull')
})

eventEmiter.on('alreadyInRoom', (payload)=>{
    alert('alreadyInRoom')
})

eventEmiter.on('roomNotFound', (payload)=>{
    alert('roomNotFound')
})

eventEmiter.on('createOffer', (payload)=>{
    createOffer(payload.roomID, payload.participantID)
})

eventEmiter.on('offer', (payload)=>{
    createAnswer(payload)
})

eventEmiter.on('answer', (payload)=>{
    acceptAnswer(payload)
})


eventEmiter.on('candidate', (payload)=>{
    
    console.log('iceCandidate', peerConnections, payload, payload.partnerID)
    peerConnections[payload.partnerID].addIceCandidate(new RTCIceCandidate({
        candidate: payload.candidate.candidate,
        sdpMLineIndex: payload.candidate.sdpMLineIndex
    }))
})

function onIceCandidate(event){
    if(event.candidate){
        console.log('sending ice canditates')
        websocket.send(JSON.stringify({'event': 'candidate', payload:{candidate: event.candidate, roomID: roomID, partnerID: participantID}}))
    }
    // var candidate = new RTCIceCandidate({
    //     sdpMLineIndex: event.label,
    //     candidate: event.candidate
    // });
}

function newCandidate(){
    console.log('new canditate')
    websocket.send(JSON.stringify({event:'newCandidate', payload:{
        roomID: roomID,
        participantID: participantID
    }}))
}

function createAnswer(payload){
    console.log('create answer')
    var peerConnection = new RTCPeerConnection(iceServers)
    peerConnection.onicecandidate = onIceCandidate
    addLocalStream(peerConnection)
    peerConnections[payload.partnerID] = peerConnection
    peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sessDes))
    peerConnection.createAnswer().then(sessDes=>{
        peerConnections[payload.partnerID].setLocalDescription(sessDes)
        websocket.send(JSON.stringify({event:'answer', payload:{
            roomID: roomID,
            sessDes: sessDes,
            partnerID: participantID,
            participantID: payload.partnerID
        }}))
    })
}

function acceptAnswer(payload){
    console.log('accept answer')
    console.log(peerConnections)
    peerConnections[payload.partnerID].setRemoteDescription(payload.sessDes)
}

function addLocalStream(peerConnection){
    peerConnection.ontrack = onAddStream;
    peerConnection.addTrack(localStream.getTracks()[0], localStream)
    peerConnection.addTrack(localStream.getTracks()[1], localStream)
}

function createOffer(roomID, partnerID){
    console.log('create offer')
    var peerConnection = new RTCPeerConnection(iceServers)
    peerConnection.onicecandidate = onIceCandidate
    addLocalStream(peerConnection)
    peerConnections[partnerID] = peerConnection
    peerConnection.createOffer().then(sessDes=>{
        peerConnections[partnerID].setLocalDescription(sessDes)
        websocket.send(JSON.stringify({event:'offer', payload:{
            roomID: roomID,
            participantID: partnerID,
            partnerID: participantID,
            sessDes: sessDes
        }}))
    })
}

var mediaStream
var video

function onAddStream(event){
    console.log('add stream')
    if(event.track.kind === "audio"){
        video = document.createElement("video")
        video.className = "player"
        parent.appendChild(video)
        video.srcObject = event.streams[0];
        video.play();
        remoteStreams.push(event.streams[0]);
    }
}

eventEmiter.on('success', (payload)=>{
    console.log(payload.iceServers)
    participantID = payload.participantID
    navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(function (stream) {
        localStream = stream;
        minePlayer.srcObject = stream;
        minePlayer.play();

    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    if(payload.isCaller){
        isHost = true
    }
    else{
        newCandidate()
    }
})

websocket.onopen = (event) => {
    console.log(event)
    websocket.send(JSON.stringify({ event: 'register', payload: {} }))
}

websocket.onmessage = (mess)=>{
    let data = JSON.parse(mess.data)
    eventEmiter.emit(data.event, data.payload)
}

function load() {
    joinButtom = document.getElementById('joinButton')
    roomId = document.getElementById('room')
    minePlayer = document.getElementById('mine')
    parent = document.getElementById('parent')
}

function join(){
    if(roomId.value !== ""){
        roomID = roomId.value
        websocket.send(JSON.stringify({ event: 'hostOrJoin', payload: {callID: roomId.value} }))
    }
    else 
        alert('enter room id')
}

function change(){
    roomId.value = roomId.value.match(/\d*/g).join('')
}
