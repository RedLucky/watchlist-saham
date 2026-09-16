async function fetchAiCompletion(messages, options = {}) {
  // Llama.cpp server endpoints to attempt (supports local dev, container networks, and host-gateway)
  const candidateUrls = Array.from(new Set([
    process.env.AI_API_URL,
    'http://localhost:8080/v1/chat/completions',
    'http://local-ai-server:8080/v1/chat/completions',
    'http://host.docker.internal:8080/v1/chat/completions',
    'http://127.0.0.1:8080/v1/chat/completions'
  ].filter(Boolean)));

  const payload = {
    model: 'local-model',
    messages,
    temperature: options.temperature || 0.1,
    max_tokens: options.maxTokens || 4000,
    stream: false,
    // Qwen3 "thinking" model: reasoning memakan token & waktu inferens CPU.
    // Nonaktifkan karena ai-worker hanya butuh jawaban final terstruktur.
    chat_template_kwargs: { enable_thinking: false },
    ...options
  };

  let response = null;
  let activeUrl = null;
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        activeUrl = url;
        break;
      }
      lastError = new Error(`AI API Error ${response.status} from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Failed to connect to AI server. Attempted [${candidateUrls.join(', ')}]. Last error: ${lastError?.message}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0] || {};
  const message = choice.message || {};
  // Fallback: beberapa model thinking mengisi reasoning_content saat content kosong
  const content = message.content || message.reasoning_content || '';
  
  // Deteksi nama model secara dinamis dari respons server Llama.cpp / OpenAI
  let rawModelName = (data.model && data.model !== 'local-model') ? data.model : null;
  if (!rawModelName && process.env.AI_MODEL_NAME) {
    rawModelName = process.env.AI_MODEL_NAME;
  }
  if (!rawModelName && activeUrl) {
    try {
      const modelsUrl = activeUrl.replace(/\/chat\/completions$/, '/models');
      const modelsRes = await fetch(modelsUrl);
      if (modelsRes.ok) {
        const modelsJson = await modelsRes.json();
        rawModelName = modelsJson.data?.[0]?.id || modelsJson.models?.[0]?.name || null;
      }
    } catch (_) {}
  }
  const modelName = rawModelName ? rawModelName.split('/').pop() : 'local-model';

  // Ekstraksi usage token dari API Llama.cpp / OpenAI
  let promptTokens = data.usage?.prompt_tokens ?? null;
  let completionTokens = data.usage?.completion_tokens ?? null;
  let totalTokens = data.usage?.total_tokens ?? null;

  // Fallback estimasi token jika engine tidak menyediakan usage block (1 token ≈ 4 chars)
  if (!promptTokens && messages) {
    const allPromptChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    promptTokens = Math.ceil(allPromptChars / 4);
  }
  if (!completionTokens && content) {
    completionTokens = Math.ceil(content.length / 4);
  }
  if (!totalTokens) {
    totalTokens = (promptTokens || 0) + (completionTokens || 0);
  }

  // Cek apakah Llama.cpp menyertakan timings.predicted_per_second
  const serverTps = data.timings?.predicted_per_second ? Number(data.timings.predicted_per_second.toFixed(2)) : null;

  return {
    content,
    modelName,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens
    },
    serverTps,
    raw: data
  };
}

module.exports = { fetchAiCompletion };
