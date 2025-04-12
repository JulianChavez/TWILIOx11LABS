import { NextResponse } from 'next/server';
import { addTranscription } from '../calls/route';

export async function POST(req) {
    try {
        const formData = await req.formData();
        
        // Log all form data fields for debugging
        console.log('Transcription callback form data:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        const transcriptionText = formData.get('TranscriptionText');
        const transcriptionStatus = formData.get('TranscriptionStatus');
        const callSid = formData.get('CallSid');

        console.log('Transcription received:', {
            text: transcriptionText,
            status: transcriptionStatus,
            callSid: callSid
        });

        if (transcriptionStatus === 'completed' && transcriptionText) {
            // Store the transcription
            addTranscription(callSid, transcriptionText, null); // AI response will be added later
        }

        return NextResponse.json({ 
            message: 'Transcription received successfully',
            status: transcriptionStatus
        });
    } catch (error) {
        console.error('Error in handle-transcription:', error);
        return NextResponse.json(
            { error: 'Failed to process transcription' },
            { status: 500 }
        );
    }
} 