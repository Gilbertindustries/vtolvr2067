import { createServer } from 'http';
import { Server }       from 'socket.io';

const httpServer = createServer();
const io         = new Server(httpServer, { cors: { origin: '*' } });

const players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    players[socket.id] = {};

    // ── Position (every frame) ────────────────────────────────────────
    socket.on('position', (data) => {
        socket.broadcast.emit('position', { id: socket.id, ...data });
    });

    // ── Gun fire ──────────────────────────────────────────────────────
    socket.on('fire', (data) => {
        socket.broadcast.emit('fire', data);
    });

    // ── Missile launch ────────────────────────────────────────────────
    //  Client sends the spawn snapshot (position + quaternion at fire
    //  moment). Server stamps the sender id and relays it once.
    //  Each client then simulates the missile independently — no
    //  per-frame position sync needed.
    //
    //  Expected payload from client:
    //    { px, py, pz }        spawn position
    //    { qx, qy, qz, qw }   spawn quaternion
    //    targetId              socket.id of the intended target (or null)
    socket.on('launchMissile', (data) => {
        socket.broadcast.emit('launchMissile', {
            ...data,
            fromId: socket.id,
        });
        console.log(`Missile launched by ${socket.id}`);
    });

    // ── Hit notification ──────────────────────────────────────────────
    //  Sent by the shooter when their local simulation detects a hit.
    //  Relayed to all other clients (the victim triggers its own respawn).
    socket.on('playerHit', () => {
        socket.broadcast.emit('playerHit');
        console.log(`Hit confirmed by ${socket.id}`);
    });
    socket.on('mach', () => {
        socket.broadcast.emit('machReceive');
        console.log(`Sound barrier broken reported by ${socket.id}`);
    });
    socket.on('flare', (data) => {
        socket.broadcast.emit('flare', data);
        console.log(`flare fired by ${socket.id}`);
    });
socket.on('missileDodged', () => {
        socket.broadcast.emit('missileDodged');
        console.log(`Missile dodged reported by ${socket.id}`);
    });
    // ── Disconnect ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerLeft', { id: socket.id });
    });
});

httpServer.listen(3000, () => console.log('Server running on port 3000'));