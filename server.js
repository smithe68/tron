const express = require("express");
const socket = require("socket.io");

const app = express();
const PORT = 8080;

const server = app.listen(PORT, () => {
    console.log(`server: started on http://localhost:${PORT}`);
});

app.use(express.static('public'));
const io = socket(server);

const matches = {};
const matchQueue = [];
let matchCount = 1;

function createMatch(socket1, socket2) {
    socket1.join(matchCount);
    socket2.join(matchCount)

    socket1.emit('match_found',{
        match: matchCount,
        playerNum: 1
    });
    
    socket2.emit('match_found',{
        match: matchCount,
        playerNum: 2
    });

    matches[socket1.id] = matchCount;
    matches[socket2.id] = matchCount;
    
    matchCount += 1;
}

function onFindMatch(socket) {
    if (matchQueue.length>=1) {
        createMatch(matchQueue.shift(), socket);
    } else{
        matchQueue.push(socket);
    }
}

function onUpdateDirection(data) {
    io.to(data.match).emit('update', data);
}

io.on('connection', (socket) => {
    console.log(`server: ${socket.id} connected`);
    
    socket.on('find_match', () => {
        onFindMatch(socket);
    });
    
    socket.on('update_direction', (data) => {
        onUpdateDirection(data);
    });

    socket.on('disconnect', () => {
        if (matches[socket.id] !== undefined) {
            socket.to(matches[socket.id]).emit('player_left');
            delete matches[socket.id];
        }
    });
});