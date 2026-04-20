// 获取页面上的元素
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

// 创建音频播放器
let audioPlayer = null;

// 播放音频
function playAudio(audioData) {
    try {
        // 创建 Blob 对象
        const audioBlob = new Blob([audioData], { type: 'audio/wav' });
        
        // 创建 URL
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 如果已有音频播放器，先停止它
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        
        // 创建新的音频播放器
        audioPlayer = new Audio();
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        
        console.log('🔊 正在播放语音...');
    } catch (error) {
        console.error('❌ 播放音频出错:', error);
    }
}

// 生成语音（返回音频数据）
async function generateSpeech(reply_ja) {
    try {
        console.log(`🎵 正在生成语音: "${reply_ja}"`);
        
        const response = await fetch('http://localhost:3000/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reply_ja: reply_ja
            })
        });
        
        if (!response.ok) {
            throw new Error('语音生成失败');
        }
        
        // 获取音频数据
        const audioData = await response.arrayBuffer();
        
        console.log(`✅ 语音生成成功 (${audioData.byteLength} bytes)`);
        
        // 返回音频数据，让调用者决定何时播放
        return audioData;
    } catch (error) {
        console.error('❌ 语音生成错误:', error);
        console.warn('⚠️ 语音生成失败，但文字回复已显示');
        return null;
    }
}

// 发送消息函数
async function sendMessage() {
    // 获取输入框中的文字
    const messageText = messageInput.value.trim();
    
    // 如果输入框为空，就不发送
    if (messageText === '') {
        return;
    }

    // 添加用户的消息到聊天区域
    addMessage(messageText, 'user');
    
    // 清空输入框
    messageInput.value = '';

    // 禁用发送按钮和输入框，防止重复发送
    sendBtn.disabled = true;
    messageInput.disabled = true;

    // 立即显示"思考中"的加载气泡
    const loadingBubble = addLoadingMessage();

    try {
        // 调用后台 API
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText
            })
        });

        // 检查响应是否成功
        if (!response.ok) {
            throw new Error('API 请求失败');
        }

        // 获取 AI 的回复
        const data = await response.json();
        const aiReplyZh = data.reply_zh;    // 中文文字
        const aiReplyJa = data.reply_ja;    // 日文翻译

        // 并行生成语音（不等待），同时继续处理界面
        const audioPromise = generateSpeech(aiReplyJa);
        
        // 等待语音完成
        const audioData = await audioPromise;
        
        // 现在语音生成完毕，同时删除加载气泡和显示回复
        if (loadingBubble) {
            loadingBubble.remove();
        }
        
        // 启动炫酷的音频同步打字机效果
        await typeMessageSyncWithAudio(aiReplyZh, audioData);
    } catch (error) {
        // 如果出错，删除加载气泡并显示错误信息
        if (loadingBubble) {
            loadingBubble.remove();
        }
        console.error('错误:', error);
        addMessage('哎呀！连接出错了。请检查后台服务器是否运行中... 😅', 'bot');
    } finally {
        // 重新启用按钮和输入框
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// 添加"思考中"的加载气泡
function addLoadingMessage() {
    // 创建消息元素
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group bot';

    // 机器人头像
    const avatarHTML = '<div class="message-avatar"><img src="/megumin.png" alt="惠惠" class="avatar-img"></div>';

    // 创建三个跳动的点
    const bubbleHTML = `
        <div class="message-bubble">
            <div class="message-text loading">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        </div>
    `;

    // 创建消息内容的 HTML
    messageGroup.innerHTML = avatarHTML + bubbleHTML;

    // 把消息添加到聊天区域
    chatMessages.appendChild(messageGroup);

    // 自动滚动到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 返回这个元素，以便后续删除
    return messageGroup;
}

// 添加消息到聊天区域的函数
function addMessage(text, sender) {
    // 创建消息元素
    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${sender}`;

    // 根据是用户还是机器人，设置不同的头像
    let avatarHTML;
    if (sender === 'user') {
        avatarHTML = '<div class="message-avatar">✨</div>';
    } else {
        // 机器人使用本地图片
        avatarHTML = '<div class="message-avatar"><img src="/megumin.png" alt="惠惠" class="avatar-img"></div>';
    }

    // 创建消息气泡
    const bubbleHTML = `
        <div class="message-bubble">
            <div class="message-text">${text}</div>
        </div>
    `;

    // 创建消息内容的 HTML
    messageGroup.innerHTML = avatarHTML + bubbleHTML;

    // 把消息添加到聊天区域
    chatMessages.appendChild(messageGroup);

    // 自动滚动到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 发送按钮点击事件
sendBtn.addEventListener('click', sendMessage);

// 输入框回车事件（按 Enter 发送）
messageInput.addEventListener('keypress', (event) => {
    // 如果按下的是 Enter 键
    if (event.key === 'Enter') {
        // 防止默认行为（比如换行）
        event.preventDefault();
        // 发送消息
        sendMessage();
    }
});

// 页面加载时，让输入框自动获得焦点
messageInput.focus();


//  核心独家魔法：基于音频总时长动态计算打字输出速度
async function typeMessageSyncWithAudio(text, audioData) {
    // 1. 创建气泡 DOM 结构
    const messageGroup = document.createElement("div");
    messageGroup.className = "message-group bot";
    const avatarHTML = '<div class="message-avatar"><img src="/megumin.png" alt="惠惠" class="avatar-img"></div>';
    const bubbleHTML = `
        <div class="message-bubble">
            <div class="message-text"></div>
        </div>
    `;
    messageGroup.innerHTML = avatarHTML + bubbleHTML;
    chatMessages.appendChild(messageGroup);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const textContainer = messageGroup.querySelector(".message-text");

    let durationInSeconds = 0;
    
    // 2. 如果存在音频数据，解析真正的总时长
    if (audioData) {
        try {
            const audioBlob = new Blob([audioData], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
            }

            audioPlayer = new Audio();
            audioPlayer.src = audioUrl;
            
            // 等待获取时长信息 (最多等待预解析 500ms 防止阻塞)
            await new Promise((resolve) => {
                audioPlayer.addEventListener("loadedmetadata", resolve, { once: true });
                setTimeout(resolve, 500); 
            });

            durationInSeconds = audioPlayer.duration;
            if (!isFinite(durationInSeconds) || durationInSeconds <= 0) {
                durationInSeconds = text.length * 0.15; // 兜底
            }
        } catch (err) {
            console.error("解析音频时长出错:", err);
            durationInSeconds = text.length * 0.15;
        }
    } else {
        durationInSeconds = text.length * 0.15; 
    }

    // 3. 计算文字展示权重
    const totalMs = durationInSeconds * 1000;
    let totalWeight = 0;
    // 遇到标点符号时，我们期望它停顿的时间是普通字符的 4 倍
    const punctuations = /[,.!?，。！？、；：~]/;
    for (let i = 0; i < text.length; i++) {
        if (punctuations.test(text[i])) totalWeight += 4;
        else totalWeight += 1;
    }

    // 每1点权重代表多少毫秒
    const msPerWeight = totalMs / totalWeight;

    // 4. 同步开始播放音频
    if (audioPlayer && audioPlayer.src) {
        audioPlayer.play().catch(e => console.error("播放音频被拦截:", e));
    }

    // 5. 开启酷炫的逐字打字机效果
    let currentHTML = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // 临时的基础换行处理
        if (char === "\n") currentHTML += "<br>";
        else currentHTML += char;
        
        textContainer.innerHTML = currentHTML;
        chatMessages.scrollTop = chatMessages.scrollHeight; // 实时滚动到底部

        // 根据当前字符是中文字母还是标点符号，决定停顿多久
        let charDelayMs = punctuations.test(char) ? msPerWeight * 4 : msPerWeight;
        
        // 等待指定的时间
        await new Promise(resolve => setTimeout(resolve, charDelayMs));
    }
}


// ==========================================
// 多会话与本地记忆管理模块
// ==========================================
// 状态管理
let sessions = JSON.parse(localStorage.getItem("chatSessions")) || [];
let currentSessionId = localStorage.getItem("currentSessionId") || null;

const sessionListEl = document.getElementById("sessionList");
const newChatBtn = document.getElementById("newChatBtn");

// 初始化会话系统
function initSessions() {
    if (sessions.length === 0) {
        createNewSession();
    } else {
        if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
            currentSessionId = sessions[0].id;
        }
        renderSessionList();
        renderCurrentSessionMessages();
    }
}

// 创建新会话
function createNewSession() {
    const newSession = {
        id: "session_" + Date.now(),
        title: "新对话",
        history: [] // 存放连贯的历史记录
    };
    sessions.unshift(newSession); // 插入到前面
    currentSessionId = newSession.id;
    saveSessions();
    renderSessionList();
    renderCurrentSessionMessages();
}

// 获取当前会话数据
function getCurrentSession() {
    return sessions.find(s => s.id === currentSessionId);
}

// 切换会话
function switchSession(id) {
    if (currentSessionId === id) return;
    currentSessionId = id;
    saveSessions();
    renderSessionList();
    renderCurrentSessionMessages();
}

// 保存会话到 LocalStorage
function saveSessions() {
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
    localStorage.setItem("currentSessionId", currentSessionId);
}

// === 改造消息拦截：将消息记录进入多会话结构 ===
// 拦截原有的 addMessage，同时向 DOM 和 LocalStorage 内存中双写
const originalAddMessage = addMessage;
addMessage = function(text, sender, skipSave = false) {
    // 1. 调用原始的DOM渲染代码
    originalAddMessage(text, sender);
    
    // 2. 如果是从历史记录渲染来的，则不需要重复保存
    if (skipSave) return;

    // 3. 把消息存入当前的 Session
    const session = getCurrentSession();
    if (session) {
        // 如果是新对话第一次发言，自动改标题
        if (session.history.length === 0 && sender === "user") {
            session.title = text.length > 10 ? text.substring(0, 10) + "..." : text;
            renderSessionList();
        }
        
        // 追加给后端的格式
        session.history.push({
            role: sender === "user" ? "user" : "assistant",
            content: text
        });
        saveSessions();
    }
};

// 重构打字机同步结束后的保存
const originalTypeMessageSyncWithAudio = typeMessageSyncWithAudio;
typeMessageSyncWithAudio = async function(text, audioData) {
    const session = getCurrentSession();
    if (session) {
        session.history.push({
            role: "assistant",
            content: text
        });
        saveSessions();
    }
    
    await originalTypeMessageSyncWithAudio(text, audioData);
};

// 渲染左侧会话列表
function renderSessionList() {
    sessionListEl.innerHTML = "";
    sessions.forEach(session => {
        const div = document.createElement("div");
        div.className = "session-item" + (session.id === currentSessionId ? " active" : "");
        
        // 标题部分
        const titleSpan = document.createElement("span");
        titleSpan.className = "session-title";
        titleSpan.innerText = session.title;
        titleSpan.onclick = () => switchSession(session.id);
        
        // 按钮部分（重命名和删除）
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "session-actions";
        
        // 修改名字按钮
        const editBtn = document.createElement("button");
        editBtn.className = "action-btn";
        editBtn.innerHTML = "✏️";
        editBtn.title = "重命名";
        editBtn.onclick = (e) => {
            e.stopPropagation();
            const newTitle = prompt("请输入新的对话名称：", session.title);
            if (newTitle && newTitle.trim() !== "") {
                session.title = newTitle.trim();
                saveSessions();
                renderSessionList();
            }
        };
        
        // 删除按钮
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "action-btn";
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.title = "删除对话";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`确定要删除对话 "${session.title}" 吗？此操作不可恢复。`)) {
                deleteSession(session.id);
            }
        };
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        div.appendChild(titleSpan);
        div.appendChild(actionsDiv);
        
        sessionListEl.appendChild(div);
    });
}

// 删除会话函数
function deleteSession(id) {
    // 过滤掉选中的会话
    sessions = sessions.filter(s => s.id !== id);
    
    // 如果全部删光了，自动创建一个新的
    if (sessions.length === 0) {
        createNewSession();
    } else if (currentSessionId === id) {
        // 如果删除的是当前正在看的对话，则跳到列表中的第一个
        currentSessionId = sessions[0].id;
        saveSessions();
        renderSessionList();
        renderCurrentSessionMessages();
    } else {
        // 删除的不是当前对话，直接保存并渲染列表
        saveSessions();
        renderSessionList();
    }
}

// 渲染右侧属于该会话的历史消息
function renderCurrentSessionMessages() {
    chatMessages.innerHTML = ""; // 清空当前视图
    const session = getCurrentSession();
    if (session && session.history.length > 0) {
        // 遍历并重新渲染 DOM，并跳过保存（因为原本就在localStorage里）
        session.history.forEach(msg => {
            originalAddMessage(msg.content, msg.role === "user" ? "user" : "bot");
        });
    } else {
        // 渲染欢迎语（不存入记忆，纯视觉）
        const messageGroup = document.createElement("div");
        messageGroup.className = "message-group bot";
        messageGroup.innerHTML = `
            <div class="message-avatar"><img src="/megumin.png" alt="惠惠" class="avatar-img"></div>
            <div class="message-bubble"><div class="message-text">你好！ 我是惠惠，随时可以开始新的对话哦！</div></div>
        `;
        chatMessages.appendChild(messageGroup);
    }
}

// 改写发请求时的 history 逻辑
const oldFetch = window.fetch;
window.fetch = async function(url, options) {
    if (url.includes("/api/chat") && options.body) {
        const bodyObj = JSON.parse(options.body);
        const session = getCurrentSession();
        if (session) {
            // 我们不需要单独 concat 用户在输入框最新发的消息，
            // 因为执行 fetch 之前，addMessage(messageText, 'user') 已经把它 push 进 session.history 里面了。
            // 但如果因为执行顺序没来得及入队，我们可以检查最后一条是谁说的。
            let payloadHistory = [...session.history];
            
            // 为了安全起见，检查并确保不会双重发送：
            if (payloadHistory.length > 0 && payloadHistory[payloadHistory.length - 1].content === bodyObj.message) {
                // 已经在里面了，不需要 concat
            } else {
                payloadHistory.push({ role: "user", content: bodyObj.message });
            }
            
            bodyObj.history = payloadHistory;
            options.body = JSON.stringify(bodyObj);
        }
    }
    return oldFetch(url, options);
}

// 绑定新建对话按钮
newChatBtn.addEventListener("click", createNewSession);

// 核心初始化启动
setTimeout(initSessions, 100);

