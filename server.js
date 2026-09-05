const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route to serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    transports: ['polling', 'websocket']
});
let poll = {
    title: 'Default Poll Title',
    maxVotesPerUser: 1,
    totalVotes: 0,
    candidates: [
        { id: 1, name: 'Candidate A', votes: 0 },
        { id: 2, name: 'Candidate B', votes: 0 }
    ]
};

io.on('connection', (socket) => {
    socket.emit('pollUpdated', poll);

    socket.on('adminLogin', (pass) => {
        if (pass === 'admin123') socket.emit('adminAuthSuccess');
        else socket.emit('adminAuthError', 'Invalid password!');
    });

    socket.on('updatePollConfig', (data) => {
        poll = {
            title: data.title || poll.title,
            maxVotesPerUser: parseInt(data.maxVotesPerUser) || 1,
            totalVotes: 0,
            candidates: data.candidates.map((name, i) => ({ id: i + 1, name, votes: 0 }))
        };
        io.emit('pollUpdated', poll);
    });

    socket.on('submitVote', (candidateIds) => {
        candidateIds.forEach(id => {
            const candidate = poll.candidates.find(c => c.id === id);
            if (candidate) {
                candidate.votes += 1;
                poll.totalVotes += 1;
            }
        });
        io.emit('pollUpdated', poll);
        socket.emit('voteSuccess');
    });

    socket.on('resetVotes', () => {
        poll.totalVotes = 0;
        poll.candidates.forEach(c => c.votes = 0);
        io.emit('pollUpdated', poll);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
