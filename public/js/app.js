const app = require('express')() //for routes
const http = require('http').Server(app)

const io = require('socket.io')(http, {
    cors: {
        origin: "http://193.168.146.106",
        methods: ["GET", "POST"]
    }
});

var port = 8080

io.on('connection', (socket) => {
    console.log('A new user is connected...')
    socket.on('disconnect', () => {
        console.log('User disconnected...')
    });
    socket.on('clienttoserver', (msg) => {
        console.log('message: ' + msg)
        io.emit('servertoclient', msg)
    })
})

http.listen(port, () => {
    console.log('listening on port ' + port + '...')
})