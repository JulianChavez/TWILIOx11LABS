import { NextResponse } from 'next/server';
import twilio from 'twilio';
import OpenAI from 'openai';
import axios from 'axios';
import { addTranscription, callTranscriptions } from '../calls/route';
import { sendAudioToCall } from '../stream/route';

const VoiceResponse = twilio.twiml.VoiceResponse;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Maximum number of retries for waiting for transcription
const MAX_RETRIES = 3;
// Time to wait between retries (in seconds)
const RETRY_DELAY = 2;

export async function POST(req) {
    try {
        const formData = await req.formData();
        const callSid = formData.get('CallSid');
        const retryCount = parseInt(formData.get('retryCount') || '0');
        
        console.log('Processing speech for call:', callSid, 'Retry:', retryCount);
        
        // Get the latest transcription for this call
        const callTranscripts = callTranscriptions[callSid] || [];
        const latestTranscription = callTranscripts[callTranscripts.length - 1];
        
        if (!latestTranscription || !latestTranscription.user) {
            if (retryCount >= MAX_RETRIES) {
                console.log('Max retries reached, ending call');
                const twiml = new VoiceResponse();
                twiml.say('I apologize, but I am having trouble processing your message. Please try again later.');
                twiml.hangup();
                return new NextResponse(twiml.toString(), {
                    headers: { 'Content-Type': 'text/xml' }
                });
            }

            console.log('No transcription available yet, waiting...');
            const twiml = new VoiceResponse();
            twiml.say('I am still processing your message. Please wait a moment.');
            twiml.pause({ length: RETRY_DELAY });
            
            // Add retry count to the redirect URL
            const redirectUrl = `/api/process-speech?retryCount=${retryCount + 1}`;
            twiml.redirect(redirectUrl);
            
            return new NextResponse(twiml.toString(), {
                headers: { 'Content-Type': 'text/xml' }
            });
        }

        const transcription = latestTranscription.user;
        console.log('Processing transcription:', transcription);

        // Generate AI response using OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant. Keep your responses concise and conversational."
                },
                {
                    role: "user",
                    content: transcription
                }
            ],
            max_tokens: 150
        });

        const aiResponse = completion.choices[0].message.content;
        console.log('OpenAI response:', aiResponse);

        // Update the transcription with AI response
        if (latestTranscription) {
            latestTranscription.ai = aiResponse;
        }

        try {
            // Convert AI response to speech using ElevenLabs with timeout
            const elevenLabsResponse = await Promise.race([
                axios({
                    method: 'POST',
                    url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
                    headers: {
                        'Accept': 'audio/mpeg',
                        'xi-api-key': process.env.ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        text: aiResponse,
                        model_id: "eleven_monolingual_v1",
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.5
                        }
                    },
                    responseType: 'arraybuffer',
                    timeout: 10000 // 10 second timeout
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('ElevenLabs timeout')), 10000)
                )
            ]);

            // Send audio through WebSocket
            await sendAudioToCall(callSid, elevenLabsResponse.data);

            // Create TwiML response for continuing the conversation
            const twiml = new VoiceResponse();
            
            // Continue the conversation
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
        } catch (elevenLabsError) {
            console.error('ElevenLabs error:', elevenLabsError);
            // Fallback to Twilio's text-to-speech if ElevenLabs fails
            const twiml = new VoiceResponse();
            twiml.say({
                voice: 'Polly.Amy',
                language: 'en-GB'
            }, aiResponse);
            
            // Continue the conversation
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
        }
    } catch (error) {
        console.error('Error in process-speech:', error);
        const twiml = new VoiceResponse();
        twiml.say('Sorry, there was an error processing your request. Please try again.');
        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml',
            },
            status: 200
        });
    }
} 