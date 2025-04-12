import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req) {
    try {
        const formData = await req.formData();
        const callSid = formData.get('CallSid');
        
        const twiml = new VoiceResponse();
        
        // Start the media stream
        const stream = twiml.start();
        stream.stream({
            url: `wss://${req.headers.get('host')}/api/stream/ws?callSid=${callSid}`,
            track: 'inbound_track',
            statusCallback: `/api/stream/status?callSid=${callSid}`,
            statusCallbackEvent: ['started', 'stopped', 'failed']
        });
        
        // Initial greeting
        twiml.say({
            voice: 'Polly.Amy',
            language: 'en-GB'
        }, 'Hello! I am your AI assistant. How can I help you today?');
        
        // Record user's speech
        twiml.record({
            action: '/api/handle-recording',
            method: 'POST',
            transcribe: true,
            transcribeCallback: '/api/handle-transcription',
            maxLength: 30,
            playBeep: true,
            trim: 'trim-silence'
        });
        
        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml',
            },
        });
    } catch (error) {
        console.error('Error in incoming-call:', error);
        const twiml = new VoiceResponse();
        twiml.say('Sorry, there was an error processing your call. Please try again later.');
        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml',
            },
        });
    }
} 