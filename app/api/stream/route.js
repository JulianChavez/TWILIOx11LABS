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

    console.log('New WebSocket connection for call:', callSid, 'State:', ws.readyState);
    
    // Store the WebSocket connection with additional metadata
    activeStreams.set(callSid, {
        ws,
        timestamp: Date.now(),
        status: 'connected'
    });

    // Log all active connections
    console.log('Active WebSocket connections:', Array.from(activeStreams.keys()));
    
    ws.on('message', (message) => {
        console.log('Received message from call:', callSid);
    });
    
    ws.on('close', () => {
        console.log('WebSocket closed for call:', callSid);
        activeStreams.delete(callSid);
        console.log('Remaining active connections:', Array.from(activeStreams.keys()));
    });

    ws.on('error', (error) => {
        console.error('WebSocket error for call:', callSid, error);
        activeStreams.delete(callSid);
        console.log('Remaining active connections:', Array.from(activeStreams.keys()));
    });

    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
            console.log('Ping sent to call:', callSid);
        } else {
            console.log('WebSocket not open for ping, call:', callSid, 'State:', ws.readyState);
            clearInterval(pingInterval);
            activeStreams.delete(callSid);
        }
    }, 30000);

    ws.on('close', () => {
        clearInterval(pingInterval);
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
        const connection = activeStreams.get(callSid);
        if (!connection) {
            console.error('No WebSocket connection found for call:', callSid);
            return;
        }

        const { ws } = connection;
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(audioBuffer);
            console.log('Audio sent to call:', callSid);
        } else {
            console.error('WebSocket not in OPEN state for call:', callSid, 'State:', ws.readyState);
            activeStreams.delete(callSid);
        }
    } catch (error) {
        console.error('Error sending audio to call:', callSid, error);
        activeStreams.delete(callSid);
    }
}

// Start the WebSocket server
server.listen(process.env.WS_PORT || 3001, () => {
    console.log('WebSocket server listening on port', process.env.WS_PORT || 3001);
}); 