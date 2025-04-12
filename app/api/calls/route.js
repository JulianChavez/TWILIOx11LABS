import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// In-memory storage for call transcriptions
export const callTranscriptions = {};

export async function GET() {
    try {
        // Fetch recent calls from Twilio
        const calls = await client.calls.list({
            limit: 20,
            status: ['in-progress', 'completed']
        });

        // Format calls with their transcriptions
        const formattedCalls = await Promise.all(calls.map(async (call) => {
            return {
                sid: call.sid,
                from: call.from,
                to: call.to,
                status: call.status,
                duration: call.duration,
                startTime: call.startTime,
                transcriptions: callTranscriptions[call.sid] || []
            };
        }));

        return NextResponse.json(formattedCalls);
    } catch (error) {
        console.error('Error fetching calls:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calls' },
            { status: 500 }
        );
    }
}

// Helper function to add transcription to a call
export function addTranscription(callSid, userText, aiText) {
    if (!callSid) {
        console.error('No CallSid provided for transcription');
        return;
    }

    if (!callTranscriptions[callSid]) {
        callTranscriptions[callSid] = [];
    }
    
    callTranscriptions[callSid].push({
        user: userText,
        ai: aiText,
        timestamp: new Date().toISOString()
    });
    
    console.log('Updated transcriptions for call:', callSid, callTranscriptions[callSid]);
} 