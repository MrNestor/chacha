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
        input, textarea, button { width: 100%; box-sizing: border-box; margin-bottom: 10px; padding: 10px; border-radius: 4px; border: 1px solid #ccc; }
        button { background-color: #0051c3; color: white; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background-color: #003a8c; }
        .result { padding: 10px; background-color: #e6f2ff; border-left: 4px solid #0051c3; margin-top: 10px; display: none; white-space: pre-wrap;}
        .loading { display: none; color: #666; font-style: italic; }
    </style>
</head>
<body>
    <h2>🔮 AI 社交破冰与回复助手</h2>
    
    <div class="card">
        <h3>第一步：求签问势 (开启话题)</h3>
        <input type="text" id="targetName" placeholder="Ta的姓名/昵称">
        <input type="text" id="targetInfo" placeholder="Ta的生日/星座/生肖 (选填)">
        <button onclick="startChat()">测算今日话题</button>
        <div id="startLoading" class="loading">正在请AI起卦推演...</div>
        <div id="startResult" class="result"></div>
    </div>

    <div class="card">
        <h3>第二步：见招拆招 (分析回复)</h3>
        <textarea id="targetReply" rows="4" placeholder="将对方的回复复制到这里..."></textarea>
        <button onclick="analyzeReply()">分析意图与生成回复</button>
        <div id="replyLoading" class="loading">正在分析字里行间的意图...</div>
        <div id="replyResult" class="result"></div>
    </div>

    <script>
        async function apiCall(endpoint, payload, resultElementId, loadingElementId) {
            const resultEl = document.getElementById(resultElementId);
            const loadingEl = document.getElementById(loadingElementId);
            
            resultEl.style.display = 'none';
            loadingEl.style.display = 'block';
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                resultEl.innerText = data.response;
                resultEl.style.display = 'block';
            } catch (error) {
                resultEl.innerText = "请求失败，请检查网络或配置：" + error;
                resultEl.style.display = 'block';
            } finally {
                loadingEl.style.display = 'none';
            }
        }

        function startChat() {
            const name = document.getElementById('targetName').value;
            const info = document.getElementById('targetInfo').value;
            if(!name) return alert("请输入对方姓名");
            apiCall('/api/init', { name, info }, 'startResult', 'startLoading');
        }

        function analyzeReply() {
            const reply = document.getElementById('targetReply').value;
            if(!reply) return alert("请输入对方的回复");
            apiCall('/api/reply', { reply }, 'replyResult', 'replyLoading');
        }
    </script>
</body>
</html>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 1. 路由：提供前端页面 (GET /)
        if (request.method === 'GET' && url.pathname === '/') {
            return new Response(HTML_CONTENT, {
                headers: { 'Content-Type': 'text/html;charset=UTF-8' },
            });
        }

        // 2. 路由：处理开启话题的 API (POST /api/init)
        if (request.method === 'POST' && url.pathname === '/api/init') {
            const { name, info } = await request.json();
            const prompt = `你是一个精通易经、六爻和梅花易数的高情商社交专家。今天日期是${new Date().toLocaleDateString()}。用户想要给名为“${name}”的人（信息：${info || '未知'}）发消息打招呼。
            请结合玄学理论（随便起一卦），推算出今天最适合与Ta开启聊天的安全且有趣的话题。
            请输出：
            1. 【今日卦象】：简述一个卦象及解释。
            2. 【宜聊话题】：2-3个具体的话题方向。
            3. 【开场白模板】：直接可以复制发送的打招呼文案。`;
            
            return await callAI(env, prompt);
        }

        // 3. 路由：处理分析回复的 API (POST /api/reply)
        if (request.method === 'POST' && url.pathname === '/api/reply') {
            const { reply } = await request.json();
            const prompt = `你是一个顶级心理学家和高情商聊天大师。你正在协助用户追求或维系与某人的关系。
            对方刚刚回复了这段话：“${reply}”
            请深入分析：
            1. 【潜台词与情绪】：对方现在的心情如何？这句话背后是否有潜台词或敷衍/热情的迹象？
            2. 【应对策略】：目前应该推进、防守还是转移话题？
            3. 【回复模板】：提供2-3个不同风格（幽默、体贴、反问）的高情商回复文案供用户直接复制。`;

            return await callAI(env, prompt);
        }

        return new Response("Not Found", { status: 404 });
    }
};

// 封装具备 Fallback (自动降级) 机制的 AI 调用逻辑
async function callAI(env, systemPrompt) {
    // 从环境变量读取模型配置，若未配置则提供默认硬编码兜底
    const primaryModel = env.PRIMARY_MODEL || '@cf/meta/llama-3-8b-instruct';
    const fallbackModel = env.FALLBACK_MODEL || '@cf/meta/llama-2-7b-chat-int8'; 

    const messages = [
        { role: "system", content: systemPrompt }
    ];

    try {
        // 尝试调用主模型
        const response = await env.AI.run(primaryModel, { messages });
        return new Response(JSON.stringify({ response: response.response }), {
            headers: { 'Content-Type': 'application/json;charset=UTF-8' }
        });
    } catch (e) {
        console.warn(`主模型 ${primaryModel} 调用失败 (可能是5028废弃): ${e.message}。正在启动 Fallback 机制...`);
        
        try {
            // 主模型报错，启动兜底模型调用
            const fallbackResponse = await env.AI.run(fallbackModel, { messages });
            return new Response(JSON.stringify({ 
                response: fallbackResponse.response + "\n\n(注：主模型暂不可用，当前为备用模型生成结果)" 
            }), {
                headers: { 'Content-Type': 'application/json;charset=UTF-8' }
            });
        } catch (fallbackError) {
            // 双重模型均不可用，抛出彻底失败信息
            return new Response(JSON.stringify({ 
                response: `核心调用失败: 无法连接到任何可用的 AI 模型。详细错误: ${fallbackError.message}` 
            }), { status: 500 });
        }
    }
}
