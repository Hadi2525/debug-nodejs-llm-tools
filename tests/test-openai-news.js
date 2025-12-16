import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function testOpenAINews() {
  try {
    console.log(`📰 Testing OpenAI News Query`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    
    const response = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'What is happening with OpenAI lately? Any recent updates?',
      }),
    });

    const data = await response.json();
    console.log('\n✅ Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOpenAINews();
