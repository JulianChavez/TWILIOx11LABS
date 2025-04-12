import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { WebSocketServer } from 'ws';
import { Server } from 'http';

// Create HTTP server for WebSocket
const server = new Server();
const wss = new WebSocketServer({ server });

// Store active streams
const activeStreams = new Map();

wss.on('connection', (ws, request) => {
    const url = new URL(request.url, 'http://localhost');
    const callSid = url.searchParams.get('callSid');
    
    if (!callSid) {
        console.error('No CallSid provided in WebSocket connection');
        ws.close();
        return;
    }

    console.log('New WebSocket connection for call:', callSid);
    
    activeStreams.set(callSid, ws);
    
    ws.on('message', (message) => {
        // Handle incoming audio from the call if needed
        console.log('Received message from call:', callSid);
    });
    
    ws.on('close', () => {
        console.log('WebSocket closed for call:', callSid);
        activeStreams.delete(callSid);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error for call:', callSid, error);
        activeStreams.delete(callSid);
    });
});

export async function POST(req) {
    try {
        const formData = await req.formData();
        const callSid = formData.get('CallSid');
        
        if (!callSid) {
            throw new Error('No CallSid provided');
        }

        const twiml = new twilio.twiml.VoiceResponse();
        
        // Start the media stream
        const stream = twiml.start();
        stream.stream({
            url: `wss://${req.headers.get('host')}/api/stream/ws?callSid=${callSid}`,
            track: 'inbound_track'
        });
        
        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });
    } catch (error) {
        console.error('Error in stream POST:', error);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error setting up the audio stream.');
        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}

// Function to send audio to a specific call
export async function sendAudioToCall(callSid, audioBuffer) {
    try {
        const ws = activeStreams.get(callSid);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(audioBuffer);
            console.log('Audio sent to call:', callSid);
        } else {
            console.error('No active WebSocket connection for call:', callSid);
        }
    } catch (error) {
        console.error('Error sending audio to call:', callSid, error);
    }
}

// Start the WebSocket server
server.listen(process.env.WS_PORT || 3001, () => {
    console.log('WebSocket server listening on port', process.env.WS_PORT || 3001);
}); 