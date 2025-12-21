// LINE Bot 增強版 - 完整功能實現
// Enhanced LINE Bot - Complete Feature Implementation
// 
// 功能包含：
// Features include:
// - 任務管理系統 (Task Management System)
// - AI 對話功能 (AI Conversation Feature)
// - 網路搜索功能 (Web Search Feature)
// - 互動功能 (Interactive Features)

require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==================== 配置初始化 ====================
// Configuration Initialization

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET || '',
  port: process.env.PORT || 3000
};

// 驗證 LINE Bot 配置
// Validate LINE Bot configuration
const hasValidConfig = !!(config.channelAccessToken && config.channelSecret);

// 初始化 LINE Bot SDK
// Initialize LINE Bot SDK
const client = hasValidConfig ? new line.Client(config) : null;

// ==================== Gemini AI 初始化 ====================
// Gemini AI Initialization

let genAI = null;
const enableAIFeatures = process.env.ENABLE_AI_FEATURES === 'true' && !!process.env.GEMINI_API_KEY;

if (enableAIFeatures && process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI 初始化成功');
  } catch (error) {
    console.error('❌ Gemini AI 初始化失敗:', error.message);
    genAI = null;
  }
} else {
  console.log('ℹ️ Gemini AI 未啟用（未設置 GEMINI_API_KEY 或 ENABLE_AI_FEATURES=false）');
}

// ==================== Express 應用初始化 ====================
// Express Application Initialization

const app = express();

// 中間件設置
// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== 任務管理系統 ====================
// Task Management System

// 每日任務儲存（實際應用中應使用資料庫）
// Daily task storage (should use database in production)
const tasks = {};

// 初始化今日任務
// Initialize today's tasks
function initTasks() {
  const today = new Date().toISOString().split('T')[0];
  if (!tasks[today]) {
    tasks[today] = {
      '日文': { done: false, note: '' },
      '健身': { done: false, note: '' },
      '閱讀': { done: false, note: '' }
    };
  }
  return today;
}

// 獲取任務列表
// Get task list
function getTaskList(date) {
  const taskList = tasks[date] || {};
  let message = `📋 ${date} 的任務清單：\n\n`;
  
  for (const [taskName, taskData] of Object.entries(taskList)) {
    const status = taskData.done ? '☑' : '☐';
    const note = taskData.note ? `\n   📝 備註：${taskData.note}` : '';
    message += `${status} ${taskName}${note}\n`;
  }
  
  return message;
}

// 標記任務完成
// Mark task as done
function completeTask(date, taskName) {
  if (!tasks[date]) {
    initTasks();
  }
  
  if (tasks[date][taskName]) {
    tasks[date][taskName].done = true;
    return true;
  }
  return false;
}

// 取消任務完成
// Cancel task completion
function cancelTask(date, taskName) {
  if (tasks[date] && tasks[date][taskName]) {
    tasks[date][taskName].done = false;
    return true;
  }
  return false;
}

// 添加任務備註
// Add task note
function addTaskNote(date, taskName, note) {
  if (!tasks[date]) {
    initTasks();
  }
  
  if (tasks[date][taskName]) {
    tasks[date][taskName].note = note;
    return true;
  }
  return false;
}

// 清除任務備註
// Clear task note
function clearTaskNote(date, taskName) {
  if (tasks[date] && tasks[date][taskName]) {
    tasks[date][taskName].note = '';
    return true;
  }
  return false;
}

// 獲取任務統計
// Get task statistics
function getTaskStats(date) {
  const taskList = tasks[date] || {};
  const total = Object.keys(taskList).length;
  const completed = Object.values(taskList).filter(t => t.done).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    percentage,
    message: `📊 任務完成統計：\n\n✅ 已完成：${completed}/${total}\n📈 完成率：${percentage}%\n\n${percentage >= 80 ? '🎉 太棒了！繼續保持！' : percentage >= 50 ? '💪 加油！還有一半就完成了！' : '🚀 開始行動吧！'}`
  };
}

// ==================== AI 回應系統 ====================
// AI Response System

// AI 回應資料庫（備用系統）
// AI response database (fallback system)
const aiResponses = {
  greeting: [
    '你好！我是你的 LINE Bot 助手 👋\n有什麼我可以幫你的嗎？',
    '嗨！很高興見到你 😊\n今天過得如何？',
    '哈囉！準備好開始新的一天了嗎？✨',
    '你好！我是你的智能助手 🤖\n隨時為你服務！'
  ],
  programming: [
    '程式設計很有趣呢！💻\n需要我幫你找相關資料嗎？',
    '寫程式需要耐心和練習 💪\n加油！',
    '程式設計是一門藝術 🎨\n持續學習就會進步！'
  ],
  learning: [
    '學習是持續的過程 📚\n每天進步一點點！',
    '保持好奇心是學習的動力 🔍\n繼續加油！',
    '學習新東西總是令人興奮 ✨\n享受這個過程吧！'
  ],
  default: [
    '我還在學習中 🤔\n可以試試其他指令，或直接跟我聊天！',
    '這個問題很有趣！💭\n讓我思考一下...',
    '我需要更多資訊才能回答 😅\n可以說得更具體一點嗎？'
  ]
};

// 增強版 AI 對話功能（使用 Gemini AI）
// Enhanced AI conversation feature (using Gemini AI)
async function getAIResponse(text) {
  const lowerText = text.toLowerCase().trim();
  
  // 優先處理特定指令，避免耗費 AI 配額
  // Priority handling for specific commands to avoid using AI quota
  const commandPatterns = [
    '幫助', 'help', '任務', '查看任務', '統計', '貼圖',
    '時間', '完成 ', '取消 ', '備註 ', '清除備註 ', '搜索 ',
    '鼓勵', '加油', 'motivate'
  ];
  
  const isCommand = commandPatterns.some(pattern => 
    lowerText === pattern || lowerText.startsWith(pattern)
  );
  
  if (isCommand) {
    // 返回 null 表示這是一個命令，應由其他處理函數處理
    // Return null means this is a command, should be handled by other functions
    return null;
  }
  
  // 如果 Gemini 已啟用且初始化成功
  // If Gemini is enabled and initialized successfully
  if (enableAIFeatures && genAI) {
    try {
      console.log('🔄 正在使用 Gemini AI 處理訊息:', text);
      
      // 使用 Gemini 進行回應
      // Use Gemini for response
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `你是一個友善的 LINE 聊天機器人助手。
請用繁體中文回答，回答要簡潔（50字以內）、友好且有幫助。
使用適當的 emoji 讓回答更生動。
如果問題不清楚，可以禮貌地請用戶提供更多資訊。

用戶訊息: ${text}`;
      
      const result = await model.generateContent(prompt);
      
      if (!result || !result.response) {
        throw new Error('Gemini response format error');
      }
      
      const response = result.response.text();
      console.log('✅ Gemini 處理後的回應:', response);
      
      return response.trim();
      
    } catch (error) {
      console.error('❌ Gemini AI API 錯誤:', error.message);
      
      // 在開發模式下顯示錯誤資訊
      // Show error info in development mode
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AI === 'true') {
        console.error('錯誤詳情:', error);
      }
      
      // 繼續使用備用回應系統
      // Continue with fallback response system
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Gemini AI 未啟用或初始化失敗，使用備用回應系統');
    }
  }
  
  // 如果未啟用 AI 功能或 API 錯誤，使用備用回應系統
  // If AI is not enabled or API error, use fallback response system
  
  // 檢查問候語
  // Check greetings
  if (lowerText.includes('你好') || lowerText.includes('hi') || 
      lowerText.includes('hello') || lowerText.includes('嗨') || 
      lowerText.includes('哈囉')) {
    return aiResponses.greeting[Math.floor(Math.random() * aiResponses.greeting.length)];
  }
  
  // 檢查程式設計相關
  // Check programming related
  if (lowerText.includes('程式') || lowerText.includes('編程') || 
      lowerText.includes('coding') || lowerText.includes('programming')) {
    return aiResponses.programming[Math.floor(Math.random() * aiResponses.programming.length)];
  }
  
  // 檢查學習相關
  // Check learning related
  if (lowerText.includes('學習') || lowerText.includes('study') || 
      lowerText.includes('讀書') || lowerText.includes('learn')) {
    return aiResponses.learning[Math.floor(Math.random() * aiResponses.learning.length)];
  }
  
  // 預設回應
  // Default response
  return aiResponses.default[Math.floor(Math.random() * aiResponses.default.length)];
}

// ==================== 網路搜索功能 ====================
// Web Search Feature

// 模擬搜索結果（開發環境使用）
// Simulated search results (for development)
const mockSearchResults = {
  'javascript': {
    title: 'JavaScript 教學',
    description: 'JavaScript 是一種動態程式語言，廣泛用於網頁開發。',
    url: 'https://developer.mozilla.org/zh-TW/docs/Web/JavaScript'
  },
  'python': {
    title: 'Python 教學',
    description: 'Python 是一種易學易用的程式語言，適合初學者。',
    url: 'https://www.python.org/'
  },
  'node.js': {
    title: 'Node.js 教學',
    description: 'Node.js 是一個基於 Chrome V8 引擎的 JavaScript 運行環境。',
    url: 'https://nodejs.org/'
  },
  'line bot': {
    title: 'LINE Bot 開發指南',
    description: 'LINE Bot 開發教學和 API 文件。',
    url: 'https://developers.line.biz/'
  },
  'ai': {
    title: '人工智慧介紹',
    description: 'AI 技術和應用介紹。',
    url: 'https://ai.google/'
  }
};

// 執行網路搜索
// Perform web search
async function performWebSearch(keyword) {
  // 如果啟用了真實搜索功能（需要設置搜索 API）
  // If real search is enabled (requires search API setup)
  if (process.env.ENABLE_WEB_SEARCH === 'true' && process.env.SEARCH_API_KEY) {
    try {
      // 這裡可以整合 Google Custom Search API 或其他搜索服務
      // Here you can integrate Google Custom Search API or other search services
      // 範例：使用 Google Custom Search API
      // Example: Using Google Custom Search API
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.SEARCH_API_KEY}&cx=${process.env.SEARCH_ENGINE_ID}&q=${encodeURIComponent(keyword)}`;
      const response = await axios.get(searchUrl);
      
      if (response.data && response.data.items && response.data.items.length > 0) {
        const item = response.data.items[0];
        return {
          title: item.title,
          description: item.snippet,
          url: item.link
        };
      }
    } catch (error) {
      console.error('❌ 網路搜索 API 錯誤:', error.message);
      // 繼續使用模擬結果
      // Continue with mock results
    }
  }
  
  // 使用模擬搜索結果
  // Use mock search results
  const lowerKeyword = keyword.toLowerCase();
  for (const [key, result] of Object.entries(mockSearchResults)) {
    if (lowerKeyword.includes(key)) {
      return result;
    }
  }
  
  // 預設搜索結果
  // Default search result
  return {
    title: `關於「${keyword}」的搜尋結果`,
    description: '這是一個模擬搜索結果。在生產環境中，請設置真實的搜索 API。',
    url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
  };
}

// ==================== 互動功能 ====================
// Interactive Features

// 獲取鼓勵訊息
// Get motivational message
function getMotivationalMessage() {
  const messages = [
    '💪 加油！你可以做到的！',
    '✨ 每一天都是新的開始！',
    '🚀 持續努力，你會看到成果的！',
    '🌟 相信自己，你比想像中更強大！',
    '🎯 專注目標，一步一步前進！',
    '💫 小小的進步也是進步！',
    '🔥 保持熱情，繼續前進！',
    '🌈 風雨過後總會見彩虹！'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// 獲取隨機貼圖
// Get random sticker
function getRandomSticker() {
  // LINE 貼圖包 ID 和貼圖 ID（範例）
  // LINE sticker package ID and sticker ID (example)
  const stickers = [
    { packageId: 446, stickerId: 1988 }, // 開心
    { packageId: 446, stickerId: 1989 }, // 加油
    { packageId: 789, stickerId: 10855 }, // 慶祝
    { packageId: 789, stickerId: 10856 }  // 鼓勵
  ];
  return stickers[Math.floor(Math.random() * stickers.length)];
}

// 獲取快速回覆按鈕
// Get quick reply buttons
function getQuickReplyButtons() {
  return {
    type: 'text',
    text: '選擇功能',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '📋 查看任務',
            text: '查看任務'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '📊 統計',
            text: '統計'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🔍 搜索',
            text: '搜索 JavaScript'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '💪 鼓勵',
            text: '鼓勵'
          }
        }
      ]
    }
  };
}

// ==================== 訊息處理函數 ====================
// Message Processing Functions

// 處理文字訊息
// Handle text message
async function handleTextMessage(event) {
  const userMessage = event.message.text.trim();
  const lowerMessage = userMessage.toLowerCase();
  
  let replyText = '';
  let replyOptions = {};
  
  try {
    // 幫助指令
    // Help command
    if (lowerMessage === '幫助' || lowerMessage === 'help') {
      replyText = `🤖 LINE Bot 功能列表：

📋 任務管理：
  • 查看任務 / 任務 - 查看今日任務
  • 完成 [任務名] - 標記任務完成
  • 取消 [任務名] - 取消完成標記
  • 備註 [任務名] [內容] - 添加備註
  • 清除備註 [任務名] - 清除備註
  • 統計 - 查看完成進度

🔍 搜索功能：
  • 搜索 [關鍵字] - 搜索相關資訊

💬 互動功能：
  • 時間 / time - 查看現在時間
  • 貼圖 - 獲得隨機貼圖
  • 鼓勵 / 加油 - 獲得鼓勵訊息

💡 直接聊天 - AI 會智能回應你的訊息！`;
      replyOptions = { quickReply: getQuickReplyButtons().quickReply };
    }
    
    // 時間查詢
    // Time query
    else if (lowerMessage === '時間' || lowerMessage === 'time') {
      const now = new Date();
      const timeString = now.toLocaleString('zh-TW', { 
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      replyText = `🕐 現在時間：${timeString}`;
    }
    
    // 查看任務
    // View tasks
    else if (lowerMessage === '任務' || lowerMessage === '查看任務' || lowerMessage === 'tasks') {
      const today = initTasks();
      replyText = getTaskList(today);
      replyOptions = { quickReply: getQuickReplyButtons().quickReply };
    }
    
    // 完成任務
    // Complete task
    else if (lowerMessage.startsWith('完成 ')) {
      const taskName = userMessage.substring(3).trim();
      const today = initTasks();
      
      if (completeTask(today, taskName)) {
        replyText = `✅ 已標記「${taskName}」為完成！\n\n繼續加油！💪`;
        
        // 發送慶祝貼圖
        // Send celebration sticker
        if (client) {
          const sticker = getRandomSticker();
          await client.replyMessage(event.replyToken, {
            type: 'sticker',
            packageId: sticker.packageId,
            stickerId: sticker.stickerId
          });
        }
      } else {
        replyText = `❌ 找不到任務「${taskName}」\n\n可用任務：日文、健身、閱讀`;
      }
    }
    
    // 取消任務完成
    // Cancel task completion
    else if (lowerMessage.startsWith('取消 ')) {
      const taskName = userMessage.substring(3).trim();
      const today = initTasks();
      
      if (cancelTask(today, taskName)) {
        replyText = `🔄 已取消「${taskName}」的完成標記`;
      } else {
        replyText = `❌ 找不到任務「${taskName}」`;
      }
    }
    
    // 添加任務備註
    // Add task note
    else if (lowerMessage.startsWith('備註 ')) {
      const parts = userMessage.substring(3).trim().split(' ');
      if (parts.length >= 2) {
        const taskName = parts[0];
        const note = parts.slice(1).join(' ');
        const today = initTasks();
        
        if (addTaskNote(today, taskName, note)) {
          replyText = `📝 已為「${taskName}」添加備註：${note}`;
        } else {
          replyText = `❌ 找不到任務「${taskName}」`;
        }
      } else {
        replyText = '❌ 格式錯誤，請使用：備註 [任務名] [內容]';
      }
    }
    
    // 清除任務備註
    // Clear task note
    else if (lowerMessage.startsWith('清除備註 ')) {
      const taskName = userMessage.substring(5).trim();
      const today = initTasks();
      
      if (clearTaskNote(today, taskName)) {
        replyText = `🗑️ 已清除「${taskName}」的備註`;
      } else {
        replyText = `❌ 找不到任務「${taskName}」`;
      }
    }
    
    // 任務統計
    // Task statistics
    else if (lowerMessage === '統計' || lowerMessage === 'stats') {
      const today = initTasks();
      const stats = getTaskStats(today);
      replyText = stats.message;
    }
    
    // 網路搜索
    // Web search
    else if (lowerMessage.startsWith('搜索 ')) {
      const keyword = userMessage.substring(3).trim();
      if (keyword) {
        replyText = `🔍 正在搜索「${keyword}」...`;
        
        // 先回覆搜索中訊息
        // Reply with searching message first
        if (client) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: replyText
          });
        }
        
        // 執行搜索
        // Perform search
        const searchResult = await performWebSearch(keyword);
        
        // 發送搜索結果
        // Send search result
        if (client) {
          await client.pushMessage(event.source.userId, {
            type: 'text',
            text: `📌 ${searchResult.title}\n\n${searchResult.description}\n\n🔗 ${searchResult.url}`
          });
        }
        
        return; // 已經回覆，不需要再次回覆
      } else {
        replyText = '❌ 請提供搜索關鍵字，格式：搜索 [關鍵字]';
      }
    }
    
    // 貼圖功能
    // Sticker feature
    else if (lowerMessage === '貼圖' || lowerMessage === 'sticker') {
      if (client) {
        const sticker = getRandomSticker();
        await client.replyMessage(event.replyToken, {
          type: 'sticker',
          packageId: sticker.packageId,
          stickerId: sticker.stickerId
        });
        return; // 已經回覆，不需要再次回覆
      } else {
        replyText = '❌ LINE Bot 配置未完成，無法發送貼圖';
      }
    }
    
    // 鼓勵訊息
    // Motivational message
    else if (lowerMessage === '鼓勵' || lowerMessage === '加油' || lowerMessage === 'motivate') {
      replyText = getMotivationalMessage();
    }
    
    // AI 對話
    // AI conversation
    else {
      const aiResponse = await getAIResponse(userMessage);
      if (aiResponse) {
        replyText = aiResponse;
      } else {
        // 如果 AI 返回 null，表示是命令但未匹配，使用預設回應
        // If AI returns null, it's a command but not matched, use default response
        replyText = '🤔 我不太理解，請輸入「幫助」查看可用指令';
      }
    }
    
    // 回覆訊息
    // Reply message
    if (replyText && client) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText,
        ...replyOptions
      });
    } else if (replyText && !client) {
      console.log('⚠️ LINE Bot 未配置，無法發送訊息。回應內容：', replyText);
    }
    
  } catch (error) {
    console.error('❌ 處理訊息時發生錯誤:', error);
    
    if (client) {
      try {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ 處理您的訊息時發生錯誤，請稍後再試。'
        });
      } catch (replyError) {
        console.error('❌ 回覆錯誤訊息時失敗:', replyError);
      }
    }
  }
}

// ==================== Webhook 處理 ====================
// Webhook Handler

// LINE Webhook 路由
// LINE Webhook route
app.post('/webhook', line.middleware(config), async (req, res) => {
  if (!hasValidConfig) {
    console.error('❌ LINE Bot 配置不完整，無法處理 Webhook');
    return res.status(500).send('LINE Bot configuration incomplete');
  }
  
  try {
    const events = req.body.events;
    
    for (const event of events) {
      // 只處理訊息事件
      // Only process message events
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook 處理錯誤:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ==================== API 端點 ====================
// API Endpoints

// 健康檢查端點
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    configuration: {
      hasLineBotConfig: hasValidConfig,
      channelAccessToken: !!process.env.CHANNEL_ACCESS_TOKEN,
      channelSecret: !!process.env.CHANNEL_SECRET,
      geminiApiKey: !!process.env.GEMINI_API_KEY,
      enableAIFeatures: enableAIFeatures
    },
    features: {
      taskManagement: true,
      aiConversation: true,
      webSearch: true,
      quickReply: hasValidConfig,
      geminiAI: enableAIFeatures && !!genAI
    }
  });
});

// Gemini AI 測試端點
// Gemini AI test endpoint
app.get('/test-gemini', async (req, res) => {
  try {
    if (!genAI) {
      return res.json({
        success: false,
        error: 'Gemini AI not initialized',
        config: {
          enabled: enableAIFeatures,
          hasApiKey: !!process.env.GEMINI_API_KEY
        }
      });
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('請用繁體中文簡短回答：今天天氣如何？');
    const response = result.response.text();
    
    return res.json({
      success: true,
      response: response,
      config: {
        enabled: enableAIFeatures,
        hasApiKey: !!process.env.GEMINI_API_KEY
      }
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      config: {
        enabled: enableAIFeatures,
        hasApiKey: !!process.env.GEMINI_API_KEY
      }
    });
  }
});

// 根路徑
// Root path
app.get('/', (req, res) => {
  res.send(`
    <h1>🤖 LINE Bot 增強版</h1>
    <p>服務運行中...</p>
    <ul>
      <li><a href="/health">健康檢查</a></li>
      <li><a href="/test-gemini">測試 Gemini AI</a></li>
    </ul>
    <h2>功能特色</h2>
    <ul>
      <li>✅ 任務管理系統</li>
      <li>✅ AI 對話功能</li>
      <li>✅ 網路搜索功能</li>
      <li>✅ 互動功能（快速回覆、貼圖等）</li>
    </ul>
    <p>配置狀態：${hasValidConfig ? '✅ 已配置' : '❌ 未配置'}</p>
    <p>Gemini AI：${enableAIFeatures && genAI ? '✅ 已啟用' : '❌ 未啟用'}</p>
  `);
});

// ==================== 服務器啟動 ====================
// Server Startup

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 LINE Bot 服務器運行在端口 ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`💚 健康檢查: http://localhost:${PORT}/health`);
  console.log(`🤖 Gemini AI: ${enableAIFeatures && genAI ? '✅ 已啟用' : '❌ 未啟用'}`);
  console.log(`⚙️  LINE Bot 配置: ${hasValidConfig ? '✅ 已配置' : '❌ 未配置'}`);
  
  if (!hasValidConfig) {
    console.warn('⚠️  警告：LINE Bot 配置不完整，某些功能可能無法使用');
  }
});

// 優雅關閉處理
// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信號，正在關閉服務器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信號，正在關閉服務器...');
  process.exit(0);
});
