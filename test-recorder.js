const recorder = require('node-record-lpcm16')
const fs = require('fs')

const file = fs.createWriteStream('test.wav', { encoding: 'binary' })

recorder.record({
    sampleRateHertz: '48000',
    threshold: 0, // Silence threshold
    silence: 1000,
    keepSilence: true,
    sampleRate: 48000,
    recordProgram: 'rec', // Try also "arecord" or "sox"
})
    .stream()
    .pipe(file);
