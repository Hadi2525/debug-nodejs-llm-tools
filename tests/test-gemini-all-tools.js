import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function testGeminiAllTools() {
  try {
    console.log(`🎯 Testing Gemini All Tools Combined Query`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    
    const response = await fetch(`${BASE_URL}/query-gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'What is the current server time? Convert 30 Celsius to Fahrenheit. Find me pizza places in New York. And tell me the latest news about climate change.',
      }),
    });

    const data = await response.json();
    console.log('\n✅ Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeminiAllTools();
