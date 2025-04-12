import { NextResponse } from 'next/server';
import { callTranscriptions } from '../calls/route';

// This is a temporary in-memory store for demo purposes
// In a real app, you would use a database
let transcriptions = [];

export async function GET() {
    try {
        // Convert the transcriptions object to an array for easier viewing
        const transcriptionsArray = Object.entries(callTranscriptions).map(([callSid, transcripts]) => ({
            callSid,
            transcripts
        }));

        return NextResponse.json(transcriptionsArray);
    } catch (error) {
        console.error('Error fetching transcriptions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transcriptions' },
            { status: 500 }
        );
    }
}

// This function will be called by the handle-transcription endpoint
export function addTranscription(transcription) {
    transcriptions.push(transcription);
} 