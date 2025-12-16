import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function testGeminiPlaces() {
  try {
    console.log(`🍝 Testing Gemini Places Query`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    
    const response = await fetch(`${BASE_URL}/query-gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Find top-rated Italian restaurants in Chicago',
      }),
    });

    const data = await response.json();
    console.log('\n✅ Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeminiPlaces();
