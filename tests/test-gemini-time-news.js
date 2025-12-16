import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function testGeminiTimeNews() {
  try {
    console.log(`🕐 Testing Gemini Time + News Mixed Query`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    
    const response = await fetch(`${BASE_URL}/query-gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'What time is it right now, and what are today\'s top technology news stories?',
      }),
    });

    const data = await response.json();
    console.log('\n✅ Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeminiTimeNews();
