'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await fetch('/api/calls');
        const data = await response.json();
        setCalls(data);
      } catch (error) {
        console.error('Error fetching calls:', error);
      }
    };

    // Fetch calls every 5 seconds
    const interval = setInterval(fetchCalls, 10000);
    fetchCalls();

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">AI Phone Assistant Dashboard</h1>
      <div className="space-y-4">
        {calls.map((call, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">Call from: {call.from}</p>
                <p className="text-sm text-gray-500">Duration: {call.duration}s</p>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                call.status === 'completed' ? 'bg-green-100 text-green-800' : 
                call.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {call.status}
              </span>
            </div>
            <div className="mt-2">
              <h3 className="font-medium">Conversation:</h3>
              {call.transcriptions?.map((transcript, idx) => (
                <div key={idx} className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-sm"><span className="font-medium">User:</span> {transcript.user}</p>
                  <p className="text-sm"><span className="font-medium">AI:</span> {transcript.ai}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
} 