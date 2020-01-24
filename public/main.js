var minePlayer
var otherPlayer
var roomId
var joinButtom
var localStream
var remoteStream
var localDescription
var roomID
var isHost = false
var websocket = new WebSocket('wss://2aa21e6d.ngrok.io')

var eventEmiter = new EventEmitter()
var peerConnection

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
    if(isHost){
        createOffer(payload.roomID)
    }
})

eventEmiter.on('offer', (payload)=>{
    if(!isHost){
        createAnswer(payload)
    }
})

eventEmiter.on('answer', (payload)=>{
    if(isHost){
        acceptAnswer(payload)
    }
})


eventEmiter.on('candidate', (payload)=>{
    if(peerConnection.remoteDescription){
        console.log('iceCandidate', payload)
        peerConnection.addIceCandidate(new RTCIceCandidate({
            candidate: payload.candidate.candidate,
            sdpMLineIndex: payload.candidate.sdpMLineIndex
        }))
    }
})

function onIceCandidate(event){
    if(event.candidate){
        console.log('sending ice canditates')
        websocket.send(JSON.stringify({'event': 'candidate', payload:{candidate: event.candidate, roomID: roomID}}))
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
    }}))
}

function createAnswer(payload){
    addLocalStream()
    peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sessDes))
    peerConnection.createAnswer().then(sessDes=>{
        peerConnection.setLocalDescription(sessDes)
        websocket.send(JSON.stringify({event:'answer', payload:{
            roomID: roomID,
            sessDes: sessDes
        }}))
    })
}

function acceptAnswer(payload){
    console.log('accept answer')
    peerConnection.setRemoteDescription(payload.sessDes)
}

var bool = true

function addLocalStream(){
    if(bool){
        peerConnection.ontrack = onAddStream;
        peerConnection.addTrack(localStream.getTracks()[0], localStream)
        peerConnection.addTrack(localStream.getTracks()[1], localStream)
        bool = false
    }
}

function createOffer(roomID){
    console.log('create offer')
    addLocalStream()
    peerConnection.createOffer().then(sessDes=>{
        localDescription = sessDes
        peerConnection.setLocalDescription(sessDes)
        websocket.send(JSON.stringify({event:'offer', payload:{
            roomID: roomID,
            sessDes: sessDes
        }}))
    })
}

function onAddStream(event){
    console.log('add stream')
    otherPlayer.srcObject = event.streams[0];
    otherPlayer.play();
    remoteStream = event.streams;
}

eventEmiter.on('success', (payload)=>{
    console.log(payload.iceServers)
    peerConnection = new RTCPeerConnection(payload.iceServers)
    peerConnection.onicecandidate = onIceCandidate
    navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(function (stream) {
        localStream = stream;
        minePlayer.srcObject = stream;
        minePlayer.play();

    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    if(payload.isCaller){
        isHost = true
        // createOffer(payload.roomID)
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
    otherPlayer = document.getElementById('other')
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
