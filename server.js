import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

// Use the PORT environment variable Render provides
const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allows unpkg and other external sites to connect
        methods: ["GET", "POST"]
    }
});

// A simple route so you can check if the server is alive in your browser
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VTOL VR* 2067</title>
    <style>
        /* Remove default margins and hide scrollbars on the parent */
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden; /* Prevents double scrollbars */
        }

        /* Make the iframe fill the container exactly */
        iframe {
            display: block; /* Removes bottom gap typical of inline elements */
            width: 100vw;
            height: 100vh;
            border: none;
        }
    </style>
</head>
<body>

    <iframe src="https://unpkg.com/vtol267@latest/index.html"></iframe>

</body>
</html>`);
});

const players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    players[socket.id] = {};

    socket.on('position', (data) => {
        socket.broadcast.emit('position', { id: socket.id, ...data });
    });

    socket.on('launchMissile', (data) => {
        socket.broadcast.emit('launchMissile', { ...data, fromId: socket.id });
    });

    // ... Keep all your other socket.on events here ...

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerLeft', { id: socket.id });
    });
});

// Start the server using the dynamic PORT
httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});