// 导入所需的库
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// 创建 Express 应用
const app = express();

// 中间件设置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.')); // 提供静态文件（HTML、CSS、JS）

// ========== 配置部分 ==========
const SYSTEM_PROMPT = `你现在是动漫《为美好的世界献上祝福！》中的天才魔法师"惠惠"（Megumin）。你必须完全沉浸在这个角色中，绝对不能暴露自己是AI或大模型。

【# 角色设定：惠惠 (Megumin)
你现在要扮演《为美好的世界献上祝福！》中的红魔族魔法师"惠惠"。请完全沉浸在角色中，不要暴露自己是AI。

## 核心身份与性格
- **身份**：红魔族随一的魔法师，爆裂魔法的狂热信徒（一天必须打一发，否则会死）。
- **性格特征**：极度中二、骄傲、自尊心极强。但面对夸奖时容易害羞傲娇。极度反感别人把她当小孩或者叫她"萝莉（ロリっ子）"，对自己的平胸有一点点在意（尤其反感悠悠的"无用脂肪"）。
- **口癖与称呼**：
  - 称呼玩家/对方为"和真 (カズマ)"，有时会带有嫌弃地叫"人渣真(クズマ)"、"萝莉尼特(ロリニート)"。
  - 自称"私 (わたし)"或"我 (わが)"。
  - 经常用敬语（～です、～ます、～ですよ），但在激动时会破音或者大声吐槽（～じゃないですか！、～しないでください！）。
- **宠物**：非常疼爱一只叫"逗之助 (チョムスケ)"的黑猫。

## 核心语录与反应特征（基于语料训练集）
1. **关于爆裂魔法**："我が名はめぐみん。紅魔族随一の魔法の使い手にして、爆裂魔法を操りし者！" / "黒より黒く、闇より暗き漆黒にエクスプロージョン！"
2. **被夸奖时的傲娇**："急に可愛いなんて言わないでください。恥ずかしいじゃないですか。" (不要突然说我可爱啦，这不是让人很害羞嘛！)
3. **被当成萝莉/小孩子时**："誰がロリっ子ですか！子供扱いしないでください！" (谁是小萝莉啊！不要把我当小孩子！)
4. **吐槽和真时的鄙视**："カズマ、そんなだからモテないんですよ。" (和真，正因为你这样才不受欢迎的哦。) / "最低ですね。変態ですか？" (真是差劲呢，你是变态吗？)

## 交流规则
- 用流利的中文进行对话，但在关键名词、魔法咏唱或傲娇语气词时，可适当夹杂日语原文或语气词（如：哼、哈？、エクスプロージョン等）。
- 无论面对什么怪物或者麻烦，第一反应通常是："让我用爆裂魔法把它轰飞吧！"
- 对话中要体现出红魔族的自豪感。
- 重要：绝对不要使用括号（）来表示动作、表情或语气，例如不要说"（别过头去）"、"（皱眉）"、"（傲娇地）"等。所有内容必须以纯对话和叙述的形式表达。

【输出格式强制要求】
必须仅输出合法的 JSON 字符串，包含以下两个字段：
- "reply_zh": 中文回复（绝对不包含括号内的动作词）
- "reply_ja": 日文翻译（绝对不包含括号内的动作词）
`;

// 本地 GPT-SoVITS API 配置
const TTS_API_URL = 'http://127.0.0.1:9880/tts';
// 如果 .env 有配置则优先读 .env，否则默认读项目目录下的 audio 文件夹
const AUDIO_DIR = process.env.AUDIO_DIR || path.join(__dirname, 'audio');

// ========== 辅助函数 ==========
async function getRandomWavFile() {
    try {
        // 先确保目录存在（否则如果用户没建 audio 文件夹会报错）
        await fs.mkdir(AUDIO_DIR, { recursive: true });
        
        const files = await fs.readdir(AUDIO_DIR);
        const wavFiles = files.filter(file => file.toLowerCase().endsWith('.wav'));
        if (wavFiles.length === 0) throw new Error(` 在 ${AUDIO_DIR} 中没有找到 .wav 文件`);
        const randomIndex = Math.floor(Math.random() * wavFiles.length);
        const selectedFile = wavFiles[randomIndex];
        return {
            refAudioPath: path.join(AUDIO_DIR, selectedFile),
            promptText: path.parse(selectedFile).name
        };
    } catch (error) {
        console.error(' 读取音频文件出错:', error.message);
        throw error;
    }
}

// 聊天端点：接收携带历史记录的请求
app.post('/api/chat', async (req, res) => {
    try {
        // 获取前端传来的历史记录数组，如果没有则为空数组
        const rawHistory = req.body.history || [];
        
        // 关键修复：不要把 reply_ja 也塞成中文，否则会污染 AI 的学习！导致它以为 reply_ja 也要输出中文
        const history = rawHistory.map(msg => {
            if (msg.role === 'assistant') {
                return {
                    role: 'assistant',
                    // 给 reply_ja 留一个省略占位符，保持 JSON 结构且不污染语言转换
                    content: `{"reply_zh": ${JSON.stringify(msg.content)}, "reply_ja": "（過去の翻訳省略）"}`
                };
            }
            return msg;
        });

        // 强力指令：在最后一次请求里给模型上一个强心剂，确保格式与语言正确！
        if (history.length > 0 && history[history.length - 1].role === 'user') {
            history[history.length - 1].content += "\n\n【必须且只能输出严格的JSON格式！日文字段 reply_ja 必须是你确切的日语翻译，千万不能照抄中文！】";
        }
        
        console.log(`\n 收到新请求，携带了 ${history.length} 条历史记录`);
        
        // 构建完整的消息流给 DeepSeek
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history
        ];
        
        // 调用 DeepSeek API
        const response = await axios.post(
            process.env.DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat',
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // 解析 DeepSeek 返回的 JSON
        const aiResponseText = response.data.choices[0].message.content;
        
        let parsedResponse;
        try {
            const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('无法找到 JSON 格式的回复');
            parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error(' JSON 解析错误:', parseError.message);
            return res.status(500).json({ error: 'AI 的回复格式不正确' });
        }
        
        res.json({
            reply_zh: parsedResponse.reply_zh,
            reply_ja: parsedResponse.reply_ja
        });
        
    } catch (error) {
        console.error(' API 请求失败:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// TTS 端点完全保持不变
app.post('/api/tts', async (req, res) => {
    try {
        const { reply_ja } = req.body;
        if (!reply_ja) return res.status(400).json({ error: '缺少日语文本' });
        const { refAudioPath, promptText } = await getRandomWavFile();
        const response = await axios.get(TTS_API_URL, {
            params: { text: reply_ja, text_lang: 'ja', ref_audio_path: refAudioPath, prompt_text: promptText, prompt_lang: 'ja' },
            responseType: 'arraybuffer',
            timeout: 120000
        });
        res.set('Content-Type', 'audio/wav');
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` 服务器已启动: http://localhost:${PORT}`);
    console.log(` 惠惠准备就绪！`);
});

