// HTML 模板 (内联以简化部署)
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 社交破冰助手</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f9; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        input, textarea, button { width: 100%; box-sizing: border-box; margin-bottom: 10px; padding: 10px; border-radius: 4px; border: 1px solid #ccc; font-size: 16px; }
        button { background-color: #0051c3; color: white; border: none; cursor: pointer; font-weight: bold; padding: 12px; }
        button:hover { background-color: #003a8c; }
        button:disabled { background-color: #999; cursor: not-allowed; }
        .result { padding: 15px; background-color: #e6f2ff; border-left: 4px solid #0051c3; margin-top: 10px; display: none; white-space: pre-wrap; line-height: 1.6; }
        .loading { display: none; color: #666; font-style: italic; margin-top: 10px; }
    </style>
</head>
<body>
    <h2>🔮 AI 社交破冰与回复助手</h2>
    
    <div class="card">
        <h3>第一步：求签问势 (开启话题)</h3>
        <input type="text" id="targetName" placeholder="Ta的姓名/昵称">
        <input type="text" id="targetInfo" placeholder="Ta的生日/星座/生肖 (选填)">
        <button id="btnStart" onclick="startChat()">测算今日话题</button>
        <div id="startLoading" class="loading">正在请AI起卦推演，请稍候...</div>
        <div id="startResult" class="result"></div>
    </div>

    <div class="card">
        <h3>第二步：见招拆招 (分析回复)</h3>
        <textarea id="targetReply" rows="4" placeholder="将对方的回复复制到这里..."></textarea>
        <button id="btnReply" onclick="analyzeReply()">分析意图与生成回复</button>
        <div id="replyLoading" class="loading">正在分析字里行间的意图，请稍候...</div>
        <div id="replyResult" class="result"></div>
    </div>

    <script>
        async function apiCall(endpoint, payload, resultElementId, loadingElementId, btnId) {
            const resultEl = document.getElementById(resultElementId);
            const loadingEl = document.getElementById(loadingElementId);
            const btnEl = document.getElementById(btnId);
            
            resultEl.style.display = 'none';
            loadingEl.style.display = 'block';
            btnEl.disabled = true;
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                
                if (data && data.response) {
                    resultEl.innerText = data.response;
                } else {
                    resultEl.innerText = "后端返回了未知格式：" + JSON.stringify(data);
                }
                resultEl.style.display = 'block';
            } catch (error) {
                resultEl.innerText = "请求失败，请检查网络或配置：" + error;
                resultEl.style.display = 'block';
            } finally {
                loadingEl.style.display = 'none';
                btnEl.disabled = false;
            }
        }

        function startChat() {
            const name = document.getElementById('targetName').value;
            const info = document.getElementById('targetInfo').value;
            if(!name) return alert("请输入对方姓名");
            apiCall('/api/init', { name, info }, 'startResult', 'startLoading', 'btnStart');
        }

        function analyzeReply() {
            const reply = document.getElementById('targetReply').value;
            if(!reply) return alert("请输入对方的回复");
            apiCall('/api/reply', { reply }, 'replyResult', 'replyLoading', 'btnReply');
        }
    </script>
</body>
</html>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        try {
            // 1. 路由：提供前端页面
            if (request.method === 'GET' && url.pathname === '/') {
                return new Response(HTML_CONTENT, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
                });
            }

            // 2. 路由：处理开启话题的 API
            if (request.method === 'POST' && url.pathname === '/api/init') {
                const { name, info } = await request.json();
                const systemPrompt = "你是一个精通易经、六爻和梅花易数的高情商社交专家。请结合玄学理论，推算出适合今天开启聊天的安全且有趣的话题。";
                // 使用 Worker 运行时的当前日期
                const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
                const userPrompt = `今天日期是${today}。我想要给名为“${name}”的人（信息：${info || '未知'}）发消息打招呼。
                请输出：
                1. 【今日卦象】：简述一个卦象及解释。
                2. 【宜聊话题】：2-3个具体的话题方向。
                3. 【开场白模板】：直接可以复制发送的打招呼文案。`;
                
                return await callAI(env, systemPrompt, userPrompt);
            }

            // 3. 路由：处理分析回复的 API
            if (request.method === 'POST' && url.pathname === '/api/reply') {
                const { reply } = await request.json();
                const systemPrompt = "你是一个顶级心理学家和高情商聊天大师。你正在协助用户追求或维系与某人的关系。";
                const userPrompt = `对方刚刚回复了这段话：“${reply}”
                请深入分析：
                1. 【潜台词与情绪】：对方现在的心情如何？这句话背后是否有潜台词或敷衍/热情的迹象？
                2. 【应对策略】：目前应该推进、防守还是转移话题？
                3. 【回复模板】：提供2-3个不同风格（幽默、体贴、反问）的高情商回复文案供我直接复制。`;

                return await callAI(env, systemPrompt, userPrompt);
            }

            return new Response("Not Found", { status: 404 });

        } catch (error) {
            // 全局路由拦截，确保出错也返回标准的 JSON 格式供前端解析
            return new Response(JSON.stringify({ response: `服务端运行异常: ${error.message}` }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json;charset=UTF-8' }
            });
        }
    }
};

// 核心功能：安全提取不同 AI 模型的文本输出 (修复嵌套 JSON 暴露问题)
function extractAIOutput(aiResponse) {
    if (!aiResponse) return "未收到AI返回结果";
    
    // 1. 纯文本格式
    if (typeof aiResponse === 'string') return aiResponse;

    // 2. 适配 OpenAI 兼容格式 (解决带有 reasoning 的模型返回巨型 JSON 的问题)
    if (aiResponse.choices && Array.isArray(aiResponse.choices) && aiResponse.choices.length > 0) {
        const firstChoice = aiResponse.choices[0];
        if (firstChoice.message && firstChoice.message.content) {
            return String(firstChoice.message.content);
        }
    }

    // 3. 适配常规 Cloudflare 扁平格式
    if (aiResponse.response) return String(aiResponse.response);
    if (aiResponse.result) return String(aiResponse.result);

    // 4. 终极兜底
    try {
        return JSON.stringify(aiResponse, null, 2).substring(0, 500) + "\n...[因格式异常截断]"; 
    } catch (e) {
        return "数据解析异常，无法读取内容。";
    }
}

// 封装具备 Fallback (自动降级) 机制的 AI 调用逻辑
async function callAI(env, systemPrompt, userPrompt) {
    // 从 wrangler.toml 的 [vars] 中读取，若未读取到则使用硬编码兜底
    const primaryModel = env.PRIMARY_MODEL || '@cf/google/gemma-4-26b-a4b-it';
    const fallbackModel = env.FALLBACK_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8'; 

    // 严格遵循 System + User 的对话体例
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    try {
        const rawResponse = await env.AI.run(primaryModel, { messages });
        const cleanText = extractAIOutput(rawResponse);
        
        return new Response(JSON.stringify({ response: cleanText }), {
            headers: { 'Content-Type': 'application/json;charset=UTF-8' }
        });
    } catch (e) {
        console.warn(`主模型 ${primaryModel} 调用失败: ${e.message}。正在启动 Fallback 机制...`);
        
        try {
            const fallbackRawResponse = await env.AI.run(fallbackModel, { messages });
            const cleanFallbackText = extractAIOutput(fallbackRawResponse);
            
            return new Response(JSON.stringify({ 
                response: cleanFallbackText + "\n\n(注：当前为备用模型生成结果)" 
            }), {
                headers: { 'Content-Type': 'application/json;charset=UTF-8' }
            });
        } catch (fallbackError) {
            return new Response(JSON.stringify({ 
                response: `核心调用失败: 无法连接到任何可用的 AI 模型。详细错误: ${fallbackError.message}` 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json;charset=UTF-8' }
            });
        }
    }
}
