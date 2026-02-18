import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

// --- Types ---
interface LLMResponse {
  text: string;
  model: string;
}

// --- Providers ---

async function callGemini(prompt: string): Promise<LLMResponse> {
  if (!env.GOOGLE_API_KEY) throw new Error("Missing GOOGLE_API_KEY");
  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return { text: response.text(), model: 'Gemini 2.5 Flash' };
}

async function callDeepSeek(prompt: string): Promise<LLMResponse> {
  if (!env.DEEPSEEK_API_KEY) throw new Error("Missing DEEPSEEK_API_KEY");

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ env.DEEPSEEK_API_KEY }`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  });

  if (!response.ok) throw new Error(`DeepSeek API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'DeepSeek V3' };
}

async function callQwen(prompt: string): Promise<LLMResponse> {
  // Qwen via Alibaba DashScope (OpenAI Compatible)
  if (!env.DASHSCOPE_API_KEY) throw new Error("Missing DASHSCOPE_API_KEY");

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ env.DASHSCOPE_API_KEY }`
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`Qwen API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'Qwen Plus' };
}

async function callDoubao(prompt: string): Promise<LLMResponse> {
  // Doubao via DOUBAO (OpenAI Compatible)
  if (!env.DOUBAO_API_KEY || !env.DOUBAO_ENDPOINT_ID_TEXT) throw new Error("Missing DOUBAO credentials");

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ env.DOUBAO_API_KEY }`
    },
    body: JSON.stringify({
      model: env.DOUBAO_ENDPOINT_ID_TEXT,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`Doubao API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'Doubao' };
}

async function callZhipu(prompt: string): Promise<LLMResponse> {
  if (!env.ZHIPU_API_KEY) throw new Error("Missing ZHIPU_API_KEY");

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ env.ZHIPU_API_KEY }`
    },
    body: JSON.stringify({
      model: 'glm-4-plus',
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`Zhipu API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'GLM-4 Plus' };
}

// --- Main Router ---

export async function generateRoast(prompt: string): Promise<LLMResponse> {
  const providers: Array<{ name: string, fn: (p: string) => Promise<LLMResponse> }> = [];

  if (env.GOOGLE_API_KEY) providers.push({ name: 'Gemini', fn: callGemini });
  if (env.DEEPSEEK_API_KEY) providers.push({ name: 'DeepSeek', fn: callDeepSeek });
  if (env.DASHSCOPE_API_KEY) providers.push({ name: 'Qwen', fn: callQwen });
  if (env.DOUBAO_API_KEY && env.DOUBAO_ENDPOINT_ID_TEXT) providers.push({ name: 'Doubao', fn: callDoubao });
  if (env.ZHIPU_API_KEY) providers.push({ name: 'Zhipu', fn: callZhipu });

  if (providers.length === 0) {
    throw new Error('No LLM providers configured. Please set at least one API key.');
  }

  // Random selection
  const selected = providers[Math.floor(Math.random() * providers.length)];
  console.log(`[LLM] Selected Provider: ${ selected.name }`);

  try {
    return await selected.fn(prompt);
  } catch (error) {
    console.error(`[LLM] Provider ${ selected.name } failed:`, error);

    // Fallback logic could go here, but for now let's just fail or try another if strict reliability is needed.
    // Simple fallback: try the first available backup
    const backup = providers.find(p => p.name !== selected.name);
    if (backup) {
      console.log(`[LLM] Falling back to: ${ backup.name }`);
      return await backup.fn(prompt);
    }
    throw error;
  }
}
