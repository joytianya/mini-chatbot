// 测试API连接的脚本
// 使用CommonJS语法导入fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 测试配置
const config = {
  // 后端服务器地址
  backendUrl: 'http://localhost:5001',
  // OpenRouter API配置
  openRouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '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', // OpenRouter API密钥
    modelName: 'google/gemini-2.0-flash-exp:free'
  },
  // 测试消息
  testMessages: [
    { role: 'user', content: '你好，这是一条测试消息' }
  ]
};

// 测试后端服务器连接
async function testBackendConnection() {
  console.log('测试后端服务器连接...');
  try {
    const response = await fetch(`${config.backendUrl}/test`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 后端服务器连接成功:', data);
      return true;
    } else {
      console.error('❌ 后端服务器连接失败:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ 后端服务器连接错误:', error.message);
    return false;
  }
}

// 测试通过后端发送聊天消息
async function testBackendChat() {
  console.log('测试通过后端发送聊天消息...');
  try {
    const response = await fetch(`${config.backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: config.testMessages,
        base_url: config.openRouter.baseUrl,
        api_key: config.openRouter.apiKey,
        model_name: config.openRouter.modelName,
        web_search: false,
        deep_research: false
      }),
    });

    if (response.ok) {
      console.log('✅ 通过后端发送聊天消息成功');
      return true;
    } else {
      const text = await response.text();
      console.error('❌ 通过后端发送聊天消息失败:', response.status, response.statusText);
      console.error('响应内容:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ 通过后端发送聊天消息错误:', error.message);
    return false;
  }
}

// 测试直接请求OpenRouter API
async function testDirectOpenRouterRequest() {
  if (!config.openRouter.apiKey) {
    console.log('⚠️ 未提供OpenRouter API密钥，跳过直接请求测试');
    return false;
  }

  console.log('测试直接请求OpenRouter API...');
  try {
    const response = await fetch(`${config.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Mini Chatbot'
      },
      body: JSON.stringify({
        messages: config.testMessages,
        model: config.openRouter.modelName,
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 直接请求OpenRouter API成功');
      console.log('响应内容:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
      return true;
    } else {
      const text = await response.text();
      console.error('❌ 直接请求OpenRouter API失败:', response.status, response.statusText);
      console.error('响应内容:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ 直接请求OpenRouter API错误:', error.message);
    return false;
  }
}

// 测试CORS配置
async function testCorsConfig() {
  console.log('测试CORS配置...');
  try {
    const response = await fetch(`${config.backendUrl}/test`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('CORS预检响应状态:', response.status);
    console.log('CORS响应头:');
    response.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });
    
    return response.status === 204 || response.status === 200;
  } catch (error) {
    console.error('❌ CORS测试错误:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('=== 开始API测试 ===');
  
  // 测试后端连接
  const backendConnected = await testBackendConnection();
  if (!backendConnected) {
    console.log('⚠️ 后端连接失败，跳过后续测试');
    return;
  }
  
  // 测试CORS配置
  console.log('\n');
  const corsConfigValid = await testCorsConfig();
  console.log(corsConfigValid ? '✅ CORS配置有效' : '❌ CORS配置可能有问题');
  
  // 测试通过后端发送聊天消息
  console.log('\n');
  await testBackendChat();
  
  // 测试直接请求OpenRouter API
  console.log('\n');
  await testDirectOpenRouterRequest();
  
  console.log('\n=== API测试完成 ===');
}

// 运行测试
runAllTests();
