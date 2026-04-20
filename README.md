#  你的本地惠惠 (VibeCoding AI) 

这是一个结合了 **DeepSeek 大语言模型** 与 **GPT-SoVITS (本地 TTS)** 的二次元角色语音聊天 Web 应用。

##  特性
-  **深度角色扮演**：内置惠惠严格设定的 Prompt。
-  **双语分离输出**：前端显示中文对白，后台翻译日语调用大模型。

##  安装与运行

### 1. 环境准备
- 安装 `Node.js` (推荐 v18+)
- 准备本地 [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) 环境。
  - **🚨 核心要求**：你必须主动在 GPT-SoVITS 的 WebUI 界面中，开启 TTS API 服务（默认监听 9880 端口），保证它能在后台接收推理请求。

### 2. 克隆与配置
1. 克隆后 `npm install`。
2. 复制环境变量 `cp .env.example .env`。
3. 参考 `.env` 文件，填入你的 **DEEPSEEK_API_KEY**。

### 3. 配置语音模型
- AI 会默认读取根目录 `audio` 文件夹里的 `.wav` 文件（文件名作为参考文本）。你也可以在 `.env` 中通过 `AUDIO_DIR=绝对路径` 覆盖此设置。

### 4. 启动项目
运行 `node server.js`。在浏览器打开 `http://localhost:3000` 即可聊天！

好了，大家如果觉得对自己有帮助的话，可以关注bilbil，“白给超棒的好吗”支持一下，其次这个账号也会更新安装与运行的具体教程哦~
