// ─────────────────────────────────────────────────────────────────
//  audio.js — simple Web Audio API helpers
//  Usage:
//    import { initAudio, loadSound, loadSoundB64, playLoop, stopLoop, playOnce } from './audio.js';
//    initAudio();  // call once on first user gesture
// ─────────────────────────────────────────────────────────────────

let ctx = null;

// ─────────────────────────────────────────────────────────────────
//  initAudio()
//  Must be called after a user gesture (click, keydown, etc.)
//  Safe to call multiple times.
// ─────────────────────────────────────────────────────────────────
export function initAudio() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
}

// ─────────────────────────────────────────────────────────────────
//  loadSound(url) → AudioBuffer
//  Load from a URL or file path.
// ─────────────────────────────────────────────────────────────────
export async function loadSound(url) {
    const res  = await fetch(url);
    const buf  = await res.arrayBuffer();
    return ctx.decodeAudioData(buf);
}

// ─────────────────────────────────────────────────────────────────
//  loadSoundB64(b64) → AudioBuffer
//  Load from a base64 string (with or without data URI prefix).
// ─────────────────────────────────────────────────────────────────
export async function loadSoundB64(b64) {
    const data   = b64.includes(',') ? b64.split(',')[1] : b64;
    const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    return ctx.decodeAudioData(binary.buffer);
}

// ─────────────────────────────────────────────────────────────────
//  playLoop(buffer, volume?) → source
//  Plays a buffer in a gapless loop.
//  Returns the source node — pass it to stopLoop() to stop.
// ─────────────────────────────────────────────────────────────────
export function playLoop(buffer, volume = 1) {
    const gain        = ctx.createGain();
    gain.gain.value   = volume;
    const source      = ctx.createBufferSource();
    source.buffer     = buffer;
    source.loop       = true;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return source;
}

// ─────────────────────────────────────────────────────────────────
//  stopLoop(source)
//  Stops a looping source returned by playLoop().
//  Safe to call even if already stopped or null.
// ─────────────────────────────────────────────────────────────────
export function stopLoop(source) {
    if (!source) return;
    try { source.stop(); } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────
//  playOnce(buffer, volume?)
//  Plays a buffer once and self-cleans up.
// ─────────────────────────────────────────────────────────────────
export function playOnce(buffer, volume = 1) {
    const gain      = ctx.createGain();
    gain.gain.value = volume;
    const source    = ctx.createBufferSource();
    source.buffer   = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}

// ─────────────────────────────────────────────────────────────────
//  playDynamicLoop(buffer, volume?)
//  Plays a buffer in a gapless loop and returns both the source 
//  and the gain node so volume can be updated dynamically.
// ─────────────────────────────────────────────────────────────────
export function playDynamicLoop(buffer, volume = 1) {
    const gain      = ctx.createGain();
    gain.gain.value = volume;
    const source    = ctx.createBufferSource();
    source.buffer   = buffer;
    source.loop     = true;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return { source, gain };
}