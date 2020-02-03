let express = require('express')
let http = require('http')
let WS = require('ws').Server

let app = express()
let server = http.createServer(app)

let MAX_PARTICIPANTS = 10

let iceServers = {iceServers:[
    {
        urls: ["turn:13.250.13.83:3478?transport=tcp"],
        credential: "YzYNCouZM1mhqhmseWk6",
        username: "YzYNCouZM1mhqhmseWk6"
    },
    {
        urls: ['stun:stun1.l.google.com:19302']
    }
]}

app.use(express.static('public'))

var rooms = {}

function verifyClient(info, cb) {
    console.log(info.origin);
    cb(true, 200)
}

function subscribe(socket) {

    socket.on('register', (data) => {
        // console.log(data)
    })

    socket.on('hostOrJoin', (data) => {
        if (rooms[data.callID]) {
            let sockets = rooms[data.callID]
            if (sockets.indexOf(socket) !== -1) {
                socket.send(JSON.stringify({ event: 'alreadyInRoom', payload: {} }))
            }
            else if (sockets.length == MAX_PARTICIPANTS) {
                socket.send(JSON.stringify({ event: 'roomFull', payload: {} }))
            }
            else {
                socket.send(JSON.stringify({ event: 'success', payload: {iceServers: iceServers, participantID: rooms[data.callID].length} }))
                rooms[data.callID].push(socket)
            }
        }
        else {
            rooms[data.callID] = []
            socket.send(JSON.stringify({ event: 'success', payload: {iceServers: iceServers, isCaller: true, roomID: data.callID, participantID: rooms[data.callID].length} }))
            rooms[data.callID] = [socket]
        }
    })

    socket.on('offer', (data)=>{
        console.log("offer arrived")
        if(data.roomID && rooms[data.roomID]){
            let sock = rooms[data.roomID][data.participantID]
            sock.send(JSON.stringify({event: 'offer', payload: data}))
        }
        else{
            socket.send(JSON.stringify({ event: 'roomNotFound', payload: {} })) 
        }
    })

    socket.on('answer', (data)=>{
        console.log("answer arrived")
        if(data.roomID && rooms[data.roomID]){
            let sock = rooms[data.roomID][data.participantID]
            sock.send(JSON.stringify({event: 'answer', payload: data}))
        }
        else{
            socket.send(JSON.stringify({ event: 'roomNotFound', payload: {} })) 
        }
    })

    socket.on('newCandidate', (data)=>{
        console.log('newCandidate')
        if(data.roomID && rooms[data.roomID]){
            let sockets = rooms[data.roomID]
            sockets.map(sock=>{
                if(sock !== socket){
                    sock.send(JSON.stringify({event: 'createOffer', payload: data}))
                }
            })
        }
        else{
            socket.send(JSON.stringify({ event: 'roomNotFound', payload: {} })) 
        }
    })

    socket.on('candidate', (data)=>{
        if(data.roomID && rooms[data.roomID]){
            let sockets = rooms[data.roomID]
            sockets.map(sock=>{
                if(sock !== socket){
                    sock.send(JSON.stringify({event: 'candidate', payload: data}))
                }
            })
        }
        else{
            socket.send(JSON.stringify({ event: 'roomNotFound', payload: {} })) 
        }
    })

}

// WSApp.on('register', (data)=>{
//     console.log(data)
// })

let ws = new WS({ server: server, verifyClient: verifyClient })

ws.on('connection', (socket) => {
    console.log('new connection');
    subscribe(socket)
    socket.onmessage = (event) => {
        let data = JSON.parse(event.data)
        socket.emit(data.event, data.payload)
    }
})

server.listen(3000, () => {
    console.log("listening");
})