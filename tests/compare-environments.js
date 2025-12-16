import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const LOCALHOST_URL = 'http://localhost:3000';
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL;

if (!CLOUD_RUN_URL) {
  console.error('❌ Error: CLOUD_RUN_URL not set in .env');
  console.error('Set it with: export CLOUD_RUN_URL="https://your-service.a.run.app"');
  process.exit(1);
}

async function testEnvironment(baseUrl, environment, query, endpoint) {
  try {
    const path = endpoint.includes('gemini') ? 'query-gemini' : 'query';
    const startTime = Date.now();
    
    const response = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    return {
      success: true,
      status: response.status,
      responseTime,
      responseSize: JSON.stringify(data).length,
      tokensUsed: data.tokens_used || null,
      geminiToolCalls: data.gemini_tool_calls || null,
      toolCalls: data.tool_calls || null,
      summaryLength: data.summary ? data.summary.length : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      environment,
    };
  }
}

function formatResult(result, environment) {
  if (!result.success) {
    return `  ❌ ${environment}: ${result.error}`;
  }
  
  let output = `  ✅ ${environment}:\n`;
  output += `     • Status: ${result.status}\n`;
  output += `     • Response Time: ${result.responseTime}ms\n`;
  output += `     • Response Size: ${result.responseSize} bytes\n`;
  output += `     • Summary Length: ${result.summaryLength} chars\n`;
  
  if (result.tokensUsed !== null) {
    output += `     • Tokens Used: ${result.tokensUsed}\n`;
  }
  
  if (result.toolCalls) {
    output += `     • Tool Calls: ${result.toolCalls.length}\n`;
  }
  
  if (result.geminiToolCalls) {
    output += `     • Gemini Tool Calls: ${result.geminiToolCalls.length}\n`;
  }
  
  return output;
}

async function compareQuery(query, endpoint) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Testing: ${query.substring(0, 60)}...`);
  console.log(`🌐 Endpoint: ${endpoint}`);
  console.log('='.repeat(80));
  
  const localhostResult = await testEnvironment(LOCALHOST_URL, 'LOCALHOST', query, endpoint);
  const cloudRunResult = await testEnvironment(CLOUD_RUN_URL, 'CLOUD RUN', query, endpoint);
  
  console.log(formatResult(localhostResult, 'LOCALHOST'));
  console.log(formatResult(cloudRunResult, 'CLOUD RUN'));
  
  if (localhostResult.success && cloudRunResult.success) {
    const timeDiff = cloudRunResult.responseTime - localhostResult.responseTime;
    const timeDiffPercent = ((timeDiff / localhostResult.responseTime) * 100).toFixed(1);
    
    console.log(`\n📊 Comparison:`);
    console.log(`   • Time Difference: ${timeDiff > 0 ? '+' : ''}${timeDiff}ms (${timeDiffPercent > 0 ? '+' : ''}${timeDiffPercent}%)`);
    
    if (localhostResult.toolCalls && cloudRunResult.toolCalls) {
      const callsMatch = localhostResult.toolCalls.length === cloudRunResult.toolCalls.length;
      console.log(`   • Tool Calls Match: ${callsMatch ? '✅ Yes' : '❌ No'}`);
    }
    
    if (localhostResult.tokensUsed !== null && cloudRunResult.tokensUsed !== null) {
      const tokensMatch = localhostResult.tokensUsed === cloudRunResult.tokensUsed;
      console.log(`   • Tokens Match: ${tokensMatch ? '✅ Yes' : '❌ No'}`);
    }
  }
}

async function runComparison() {
  console.log('\n🚀 Localhost vs Cloud Run Comparison');
  console.log(`📍 Localhost: ${LOCALHOST_URL}`);
  console.log(`☁️  Cloud Run: ${CLOUD_RUN_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);
  
  const queries = [
    { query: 'What time is it?', endpoint: 'query-gemini' },
    { query: 'Convert 100 kilometers to miles', endpoint: 'query-gemini' },
    { query: 'I want to bake at 350 Fahrenheit. What is that in Celsius?', endpoint: 'query' },
    { query: 'What are recent developments in artificial intelligence?', endpoint: 'query' },
  ];
  
  for (const { query, endpoint } of queries) {
    await compareQuery(query, endpoint);
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✨ Comparison complete!');
  console.log('='.repeat(80));
  console.log('\n💡 Tips:');
  console.log('  • Response time on Cloud Run may include cold start overhead');
  console.log('  • Token usage should be identical for the same query');
  console.log('  • Tool calls should match between environments');
  console.log('  • Check Cloud Run logs with: gcloud run services logs read <service-name>');
}

runComparison().catch(console.error);
