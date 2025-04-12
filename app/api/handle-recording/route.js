import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req) {
    const twiml = new VoiceResponse();
    
    // Acknowledge the recording
    twiml.say('I received your message. Please wait while I process it.');
    
    // Add a pause to give time for transcription
    twiml.pause({ length: 2 });
    
    // Redirect to process-speech after a short delay
    twiml.redirect('/api/process-speech');
    
    return new NextResponse(twiml.toString(), {
        headers: {
            'Content-Type': 'text/xml',
        },
    });
} 