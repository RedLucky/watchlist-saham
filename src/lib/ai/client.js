const { runWithAiLock, AI_PRIORITY } = require('./aiPriorityMutex.js');

/**
 * Fetches completion from local Llama.cpp / OpenAI-compatible server.
 * Protected by single-slot AI Priority Mutex to prevent CPU core contention.
 */
async function fetchAiCompletion(messages, options = {}) {
  const priority = options.priority || (options.enableThinking ? AI_PRIORITY.HIGH : AI_PRIORITY.NORMAL);
  const taskName = options.taskName || (options.enableThinking ? 'ai-consultation' : 'ai-completion');

  return runWithAiLock(async () => {
    const candidateUrls = Array.from(new Set([
      process.env.AI_API_URL,
      'http://localhost:8080/v1/chat/completions',
      'http://local-ai-server:8080/v1/chat/completions',
      'http://host.docker.internal:8080/v1/chat/completions',
      'http://127.0.0.1:8080/v1/chat/completions'
    ].filter(Boolean)));

    const enableThinking = options.enableThinking === true;
    const temperature = Number.isFinite(options.temperature)
      ? options.temperature
      : (enableThinking ? 0.4 : 0.1);
    const topP = Number.isFinite(options.topP || options.top_p)
      ? (options.topP || options.top_p)
      : (enableThinking ? 0.85 : 0.9);

    const payload = {
      model: 'local-model',
      messages,
      temperature,
      top_p: topP,
      max_tokens: options.maxTokens || (enableThinking ? 4000 : 2000),
      stream: false,
      chat_template_kwargs: {
        enable_thinking: enableThinking,
        ...(options.chat_template_kwargs || {})
      }
    };

    let response = null;
    let activeUrl = null;
    let lastError = null;

    for (const url of candidateUrls) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
    const content = message.content || message.reasoning_content || '';

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

    let promptTokens = data.usage?.prompt_tokens ?? null;
    let completionTokens = data.usage?.completion_tokens ?? null;
    let totalTokens = data.usage?.total_tokens ?? null;

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
  }, priority, taskName);
}

module.exports = { fetchAiCompletion, AI_PRIORITY };
