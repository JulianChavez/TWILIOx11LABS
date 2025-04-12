require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

const app = express();
app.use(express.urlencoded({ extended: true }));

// Endpoint to handle incoming calls
app.post('/incoming-call', (req, res) => {
    const twiml = new VoiceResponse();
    
    twiml.say('This call will be recorded and transcribed. Please speak after the tone.');
    
    twiml.record({
        action: '/handle-recording',
        method: 'POST',
        transcribe: true,
        transcribeCallback: '/handle-transcription',
        maxLength: 60,
        playBeep: true
    });
    
    twiml.say('Recording completed. Thank you for your message.');
    
    res.type('text/xml');
    res.send(twiml.toString());
});

// Endpoint to handle completed recordings
app.post('/handle-recording', (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    console.log('Recording URL:', recordingUrl);
    
    // You can download the recording here if needed
    res.status(200).send('Recording received');
});

// Endpoint to handle transcriptions
app.post('/handle-transcription', (req, res) => {
    const transcriptionText = req.body.TranscriptionText;
    const transcriptionStatus = req.body.TranscriptionStatus;
    
    console.log('Transcription Status:', transcriptionStatus);
    console.log('Transcription Text:', transcriptionText);
    
    res.status(200).send('Transcription received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 