// LINE Bot 增強版 - 包含 Gemini AI 對話、網路搜索和互動功能
// Enhanced LINE Bot with Gemini AI conversation, web search and interactive features

const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 新增 Gemini AI 套件
require('dotenv').config();

// LINE Bot 配置
// LINE Bot configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'dummy_token',
  channelSecret: process.env.CHANNEL_SECRET || 'dummy_secret'
};

// 檢查是否有有效的 LINE Bot 配置
// Check if we have valid LINE Bot configuration
const hasValidConfig = process.env.CHANNEL_ACCESS_TOKEN && process.env.CHANNEL_SECRET;

// 創建 LINE Bot 客戶端和 Express 應用
// Create LINE Bot client and Express app
const client = hasValidConfig ? new line.Client(config) : null;
const app = express();

// 任務管理系統 - 儲存用戶的日常任務
// Task management system - stores user's daily tasks
let tasks = {};

// Gemini AI 功能開關和初始化
// Gemini AI feature toggle and initialization
const enableAIFeatures = process.env.ENABLE_AI_FEATURES === 'true';
let genAI = null;
if (enableAIFeatures && process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI 初始化成功');
} else {
  console.log('⚠️ Gemini AI 未啟用或未設定 API 密鑰');
}

// 簡單的 AI 回應系統 (作為 Gemini AI 的後備)
// Simple AI response system (as fallback for Gemini AI)
const aiResponses = {
  greeting: ['你好！我是你的智能助手 🤖', '嗨！有什麼我可以幫助你的嗎？ 😊', '哈囉！今天過得如何？ ✨'],
  weather: ['我無法直接查詢天氣，但建議你查看天氣應用程式 🌤️', '抱歉，我還沒有連接天氣服務，但你可以試試搜索"今日天氣" 🌦️'],
  time: ['現在時間是：' + new Date().toLocaleString('zh-TW'), '今天是：' + new Date().toLocaleDateString('zh-TW')],
  general: ['這是個有趣的問題！ 🤔', '讓我想想... 💭', '你說得很有道理 👍', '我理解你的想法 💡'],
  encouragement: ['你做得很棒！ 👏', '繼續加油！ 💪', '相信你可以的！ ⭐', '每天進步一點點就很棒了！ 🌟'],
  programming: ['程式設計是很棒的技能！ 💻', '學習程式語言需要時間和練習 📚', '遇到 bug 是正常的，debug 是程式設計師的日常 🐛'],
  learning: ['學習是終生的旅程 📖', '每天學習新知識讓人充實 🧠', '不懂就問，這是學習的好方法 ❓'],
  unknown: ['我不太明白，可以換個方式問我嗎？ 🤷', '抱歉，我還在學習中 📝', '這個問題有點困難，可以詳細說明嗎？ 💬']
};

// 安全回覆訊息函數 (處理缺少配置的情況)
// Safe reply message function (handles missing configuration)
function safeReplyMessage(replyToken, message) {
  if (!client) {
    console.log('⚠️ 缺少 LINE Bot 配置，無法發送訊息:', message);
    return Promise.resolve(null);
  }
  return client.replyMessage(replyToken, message);
}

// 獲取今日日期 (格式: YYYY-MM-DD)
// Get today's date (format: YYYY-MM-DD)
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// 初始化今日任務 (如果不存在)
// Initialize today's tasks (if not exist)
function initTasks(today) {
  if (!tasks[today]) {
    tasks[today] = {
      '日文': { done: false, note: '' },
      '健身': { done: false, note: '' },
      '閱讀': { done: false, note: '' }
    };
  }
}

// 增強版 AI 對話功能 (使用 Gemini AI)
// Enhanced AI conversation feature (using Gemini AI)
async function getAIResponse(text) {
  const lowerText = text.toLowerCase();
  
  // 優先處理特定指令，避免耗費 AI 配額
  // Priority handling for specific commands to avoid using AI quota
  if (lowerText === '幫助' || lowerText === 'help' || 
      lowerText === '任務' || lowerText === '查看任務' || 
      lowerText === '統計' || lowerText === '貼圖' || 
      lowerText === '時間' || lowerText.startsWith('完成 ') || 
      lowerText.startsWith('取消 ') || lowerText.startsWith('備註 ') ||
      lowerText.startsWith('清除備註 ') || lowerText.startsWith('搜索 ')) {
    // 返回 null 表示這是一個命令，應由其他處理函數處理
    // Return null means this is a command, should be handled by other functions
    return null;
  }
  
  // 如果 Gemini 已啟用且初始化成功
  // If Gemini is enabled and initialized successfully
  if (enableAIFeatures && genAI) {
    try {
      // 使用 Gemini 進行回應
      // Use Gemini for response
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
      你是一個LINE聊天機器人助手，請用50字以內簡短回答以下訊息。
      使用友善、活潑的口吻並加上合適的emoji。
      回答要簡潔、友好且有幫助。
      
      用戶訊息: ${text}
      `;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return response.trim();
      
    } catch (error) {
      console.error('Gemini AI API 錯誤:', error);
      // 失敗時使用後備回應系統
      // Use fallback response system when failed
    }
  }
  
  // 如果未啟用 AI 功能或 API 錯誤，使用原有的回應系統
  // If AI is not enabled or API error, use original response system
  
  // 檢查問候語
  // Check greetings
  if (lowerText.includes('你好') || lowerText.includes('hi') || lowerText.includes('hello') || 
      lowerText.includes('嗨') || lowerText.includes('哈囉')) {
    return aiResponses.greeting[Math.floor(Math.random() * aiResponses.greeting.length)];
  }
  
  // 檢查時間相關問題
  // Check time-related questions
  if (lowerText.includes('時間') || lowerText.includes('現在') || lowerText.includes('今天') || lowerText.includes('日期')) {
    return aiResponses.time[Math.floor(Math.random() * aiResponses.time.length)];
  }
  
  // 檢查天氣相關問題
  // Check weather-related questions
  if (lowerText.includes('天氣') || lowerText.includes('weather')) {
    return aiResponses.weather[Math.floor(Math.random() * aiResponses.weather.length)];
  }
  
  // 檢查程式設計相關
  // Check programming-related topics
  if (lowerText.includes('程式') || lowerText.includes('code') || lowerText.includes('javascript') || 
      lowerText.includes('python') || lowerText.includes('編程') || lowerText.includes('開發')) {
    return aiResponses.programming[Math.floor(Math.random() * aiResponses.programming.length)];
  }
  
  // 檢查學習相關
  // Check learning-related topics
  if (lowerText.includes('學習') || lowerText.includes('學') || lowerText.includes('教學') || lowerText.includes('課程')) {
    return aiResponses.learning[Math.floor(Math.random() * aiResponses.learning.length)];
  }
  
  // 檢查鼓勵詞語
  // Check encouragement keywords
  if (lowerText.includes('累') || lowerText.includes('困難') || lowerText.includes('辛苦') || 
      lowerText.includes('tired') || lowerText.includes('hard')) {
    return aiResponses.encouragement[Math.floor(Math.random() * aiResponses.encouragement.length)];
  }
  
  // 檢查是否為問題
  // Check if it's a question
  if (text.includes('？') || text.includes('?') || lowerText.startsWith('如何') || 
      lowerText.startsWith('怎麼') || lowerText.startsWith('為什麼')) {
    return aiResponses.general[Math.floor(Math.random() * aiResponses.general.length)];
  }
  
  // 默認回應
  // Default response
  return aiResponses.unknown[Math.floor(Math.random() * aiResponses.unknown.length)];
}

// 網路搜索功能 (包含模擬搜索作為後備方案)
// Web search functionality (includes mock search as fallback)
async function searchWeb(query) {
  try {
    console.log(`正在搜索: ${query}`);
    
    // 嘗試真實的網路搜索
    // Try real web search
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      });
      
      const $ = cheerio.load(response.data);
      const results = [];
      
      // 提取搜索結果標題
      // Extract search result titles
      $('h3').slice(0, 3).each((i, el) => {
        const title = $(el).text().trim();
        if (title && title.length > 0) {
          results.push(title);
        }
      });
      
      if (results.length > 0) {
        return `🔍 搜索結果：\n${results.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
      }
    } catch (networkError) {
      console.log('網路搜索失敗，使用模擬搜索:', networkError.message);
    }
    
    // 後備方案：模擬搜索結果 (用於展示和測試)
    // Fallback: Mock search results (for demo and testing)
    const mockResults = getMockSearchResults(query);
    return `🔍 搜索結果 (模擬)：\n${mockResults.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n💡 註：這是模擬結果，實際部署時會使用真實搜索`;
    
  } catch (error) {
    console.error('搜索錯誤:', error.message);
    return '搜索功能暫時無法使用，請稍後再試。';
  }
}

// 模擬搜索結果 (用於展示功能)
// Mock search results (for demo purposes)
function getMockSearchResults(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('javascript') || lowerQuery.includes('js')) {
    return [
      'JavaScript 基礎教學 - MDN Web Docs',
      'JavaScript 完整課程 - FreeCodeCamp',
      'JavaScript 最新教學 - W3Schools'
    ];
  } else if (lowerQuery.includes('python')) {
    return [
      'Python 官方教學文件',
      'Python 入門指南 - Real Python',
      'Python 程式設計 - Codecademy'
    ];
  } else if (lowerQuery.includes('nodejs') || lowerQuery.includes('node')) {
    return [
      'Node.js 官方文件',
      'Node.js 最佳實踐指南',
      'Node.js 教學 - Express 框架'
    ];
  } else if (lowerQuery.includes('line bot') || lowerQuery.includes('linebot')) {
    return [
      'LINE Bot SDK 官方文件',
      'LINE Bot 開發教學',
      'LINE Messaging API 使用指南'
    ];
  } else if (lowerQuery.includes('ai') || lowerQuery.includes('人工智慧')) {
    return [
      '人工智慧基礎概念',
      'AI 機器學習入門',
      'ChatGPT 和 AI 應用'
    ];
  } else {
    return [
      `關於 "${query}" 的基礎資訊`,
      `${query} 相關教學和指南`,
      `${query} 最新發展和趨勢`
    ];
  }
}

// 創建圖片訊息
// Create image message
function createImageMessage(originalContentUrl, previewImageUrl) {
  return {
    type: 'image',
    originalContentUrl: originalContentUrl,
    previewImageUrl: previewImageUrl
  };
}

// 創建貼圖訊息
// Create sticker message
function createStickerMessage(packageId, stickerId) {
  return {
    type: 'sticker',
    packageId: packageId,
    stickerId: stickerId
  };
}

// 獲取鼓勵貼圖
// Get encouraging sticker
function getEncouragingSticker() {
  // LINE 免費貼圖包
  // LINE free sticker packages
  const stickers = [
    { packageId: '1', stickerId: '1' },    // 開心
    { packageId: '1', stickerId: '2' },    // 愛心
    { packageId: '1', stickerId: '3' },    // 哭臉
    { packageId: '1', stickerId: '4' },    // 生氣
    { packageId: '1', stickerId: '106' },  // 棒棒
    { packageId: '1', stickerId: '107' },  // 讚
    { packageId: '1', stickerId: '114' },  // 加油
    { packageId: '1', stickerId: '144' },  // 愛你
  ];
  
  return stickers[Math.floor(Math.random() * stickers.length)];
}

// 創建快速回覆按鈕
// Create quick reply buttons
function createQuickReply(text, actions) {
  return {
    type: 'text',
    text: text,
    quickReply: {
      items: actions.map(action => ({
        type: 'action',
        action: {
          type: 'message',
          label: action.label,
          text: action.text
        }
      }))
    }
  };
}

// 處理事件的主要函數
// Main function to handle events
async function handleEvent(event) {
  try {
    // 只處理文字訊息
    // Only handle text messages
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }
    
    const text = event.message.text.trim();
    const today = getToday();
    initTasks(today);
    
    console.log(`收到訊息: ${text}`);
    
    // 幫助指令 - 顯示所有可用功能
    // Help command - show all available features
    if (text === '幫助' || text === 'help') {
      const helpMessage = createQuickReply(
        '🤖 LINE Bot 增強版功能列表：\n\n' +
        '📋 任務管理：\n' +
        '• 查看任務 / 任務\n' +
        '• 完成 [任務名稱]\n' +
        '• 取消 [任務名稱]\n' +
        '• 備註 [任務名稱] [內容]\n' +
        '• 清除備註 [任務名稱]\n' +
        '• 統計 - 查看進度\n\n' +
        '🔍 搜索功能：\n' +
        '• 搜索 [關鍵字]\n\n' +
        '💬 AI 對話：\n' +
        '• 直接與我聊天\n' +
        '• 鼓勵 / 加油 - 獲得鼓勵\n\n' +
        '⚡ 互動功能：\n' +
        '• 時間 - 查看現在時間\n' +
        '• 貼圖 - 獲得隨機貼圖\n\n' +
        '點擊下方按鈕快速操作：',
        [
          { label: '📋 查看任務', text: '查看任務' },
          { label: '🔍 搜索', text: '搜索' },
          { label: '📊 統計', text: '統計' },
          { label: '💪 鼓勵', text: '鼓勵' }
        ]
      );
      
    // 如果沒有有效的 LINE Bot 配置，返回錯誤
    // If no valid LINE Bot configuration, return error
    if (!client) {
      console.log('⚠️ 缺少 LINE Bot 配置，無法發送訊息');
      return null;
    }
    
    return safeReplyMessage(event.replyToken, helpMessage);
    }
    
    // 任務管理功能
    // Task management features
    
    // 查看任務
    // View tasks
    if (text === '查看任務' || text === '任務' || text === 'tasks') {
      const taskList = Object.entries(tasks[today])
        .map(([name, task]) => {
          const status = task.done ? '✅' : '⭕';
          const note = task.note ? ` (備註: ${task.note})` : '';
          return `${status} ${name}${note}`;
        })
        .join('\n');
      
      const taskMessage = createQuickReply(
        `📋 今日任務 (${today})：\n\n${taskList}`,
        [
          { label: '✅ 完成日文', text: '完成 日文' },
          { label: '✅ 完成健身', text: '完成 健身' },
          { label: '✅ 完成閱讀', text: '完成 閱讀' }
        ]
      );
      
      return safeReplyMessage(event.replyToken, taskMessage);
    }
    
    // 完成任務
    // Complete task
    const completeMatch = text.match(/^完成\s*(日文|健身|閱讀)$/);
    if (completeMatch) {
      const name = completeMatch[1];
      tasks[today][name].done = true;
      
      // 隨機選擇回應方式：文字 + 快速回覆 或 貼圖
      // Randomly choose response type: text + quick reply or sticker
      const responseType = Math.random() > 0.5 ? 'text' : 'sticker';
      
      if (responseType === 'sticker' && hasValidConfig) {
        // 發送貼圖回應
        // Send sticker response
        const encouragingSticker = getEncouragingSticker();
        return safeReplyMessage(event.replyToken, createStickerMessage(encouragingSticker.packageId, encouragingSticker.stickerId));
      } else {
        // 發送文字回應
        // Send text response
        const completeMessage = createQuickReply(
          `🎉 恭喜！已完成「${name}」任務！`,
          [
            { label: '📋 查看任務', text: '查看任務' },
            { label: '📝 添加備註', text: `備註 ${name}` }
          ]
        );
        
        return safeReplyMessage(event.replyToken, completeMessage);
      }
    }
    
    // 取消完成任務
    // Undo task completion
    const undoMatch = text.match(/^取消\s*(日文|健身|閱讀)$/);
    if (undoMatch) {
      const name = undoMatch[1];
      tasks[today][name].done = false;
      return safeReplyMessage(event.replyToken, {
        type: 'text',
        text: `已取消「${name}」的完成標記！`
      });
    }
    
    // 添加備註
    // Add note
    const noteMatch = text.match(/^備註\s*(日文|健身|閱讀)\s*(.*)$/);
    if (noteMatch) {
      const name = noteMatch[1];
      const note = noteMatch[2] || '';
      tasks[today][name].note = note;
      return safeReplyMessage(event.replyToken, {
        type: 'text',
        text: `已為「${name}」添加備註：${note || '(空白)'}`
      });
    }
    
    // 清除備註
    // Clear note
    const clearNoteMatch = text.match(/^清除備註\s*(日文|健身|閱讀)$/);
    if (clearNoteMatch) {
      const name = clearNoteMatch[1];
      tasks[today][name].note = '';
      return safeReplyMessage(event.replyToken, {
        type: 'text',
        text: `已清除「${name}」的備註！`
      });
    }
    
    // 網路搜索功能
    // Web search functionality
    const searchMatch = text.match(/^搜索\s*(.+)$/);
    if (searchMatch) {
      const query = searchMatch[1];
      const searchResult = await searchWeb(query);
      
      const searchMessage = createQuickReply(
        searchResult,
        [
          { label: '🔍 新搜索', text: '搜索' },
          { label: '📋 查看任務', text: '查看任務' }
        ]
      );
      
      return safeReplyMessage(event.replyToken, searchMessage);
    }
    
    // 特殊指令和互動功能
    // Special commands and interactive features
    
    // 貼圖指令
    // Sticker command
    if (text === '貼圖' || text === 'sticker') {
      if (hasValidConfig) {
        const sticker = getEncouragingSticker();
        return safeReplyMessage(event.replyToken, createStickerMessage(sticker.packageId, sticker.stickerId));
      } else {
        return safeReplyMessage(event.replyToken, {
          type: 'text',
          text: '😊 貼圖功能需要 LINE Bot 配置才能使用哦！'
        });
      }
    }
    
    // 時間指令
    // Time command
    if (text === '時間' || text === 'time') {
      const now = new Date();
      const timeMessage = createQuickReply(
        `⏰ 現在時間：${now.toLocaleString('zh-TW')}\n📅 今天是：${now.toLocaleDateString('zh-TW')}`,
        [
          { label: '📋 查看任務', text: '查看任務' },
          { label: '💬 聊天', text: '你好' }
        ]
      );
      return safeReplyMessage(event.replyToken, timeMessage);
    }
    
    // 統計指令
    // Statistics command
    if (text === '統計' || text === 'stats') {
      const completedTasks = Object.values(tasks[today]).filter(task => task.done).length;
      const totalTasks = Object.keys(tasks[today]).length;
      const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
      
      const statsMessage = createQuickReply(
        `📊 今日進度統計：\n\n` +
        `✅ 已完成：${completedTasks} 項\n` +
        `⭕ 未完成：${totalTasks - completedTasks} 項\n` +
        `📈 完成率：${progressPercentage}%\n\n` +
        `${progressPercentage >= 100 ? '🎉 恭喜完成所有任務！' : 
          progressPercentage >= 66 ? '👍 進度不錯，繼續加油！' : 
          progressPercentage >= 33 ? '💪 還有進步空間，加油！' : 
          '🌟 開始行動吧！'}`,
        [
          { label: '📋 查看任務', text: '查看任務' },
          { label: '🔍 搜索', text: '搜索' }
        ]
      );
      
      return safeReplyMessage(event.replyToken, statsMessage);
    }
    
    // 鼓勵指令
    // Encouragement command
    if (text === '鼓勵' || text === '加油' || text === 'motivate') {
      const encouragements = [
        '💪 你可以的！每一步都是進步！',
        '🌟 相信自己，你比想像中更強大！',
        '🚀 成功需要時間，但你已經在路上了！',
        '✨ 今天的努力是明天的收穫！',
        '🎯 專注當下，一步一步達成目標！'
      ];
      
      const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
      const encourageMessage = createQuickReply(
        encouragement,
        [
          { label: '📋 查看任務', text: '查看任務' },
          { label: '📊 查看統計', text: '統計' }
        ]
      );
      
      return safeReplyMessage(event.replyToken, encourageMessage);
    }
    
    // 如果只輸入「搜索」，提示用戶輸入關鍵字
    // If only "搜索" is entered, prompt user for keywords
    if (text === '搜索') {
      return safeReplyMessage(event.replyToken, {
        type: 'text',
        text: '🔍 請輸入搜索關鍵字，例如：「搜索 JavaScript 教學」'
      });
    }
    
    // AI 對話功能 - 處理其他所有訊息
    // AI conversation feature - handle all other messages
    try {
      // 使用非同步的 getAIResponse 函數
      // Use asynchronous getAIResponse function
      const aiResponse = await getAIResponse(text);
      
      // 如果 getAIResponse 返回 null，表示這是一個命令，但沒有被前面的條件捕獲
      // If getAIResponse returns null, it means this is a command but not captured by previous conditions
      if (aiResponse === null) {
        return safeReplyMessage(event.replyToken, {
          type: 'text',
          text: '我不認識這個指令。請輸入「幫助」查看可用的指令。'
        });
      }
      
      // 創建帶快速回覆按鈕的 AI 回應訊息
      // Create AI response message with quick reply buttons
      // Gemini 回應可能已經包含表情符號，所以不添加 🤖 前綴
      // Gemini response may already contain emoji, so don't add 🤖 prefix
      const aiMessage = createQuickReply(
        aiResponse.startsWith('🤖') ? aiResponse : `🤖 ${aiResponse}`,
        [
          { label: '📋 查看任務', text: '查看任務' },
          { label: '🔍 搜索', text: '搜索' },
          { label: '❓ 幫助', text: '幫助' }
        ]
      );
      
      return safeReplyMessage(event.replyToken, aiMessage);
    } catch (error) {
      console.error('AI 回應錯誤:', error);
      
      // 發生錯誤時使用基本回應
      // Use basic response when error occurs
      return safeReplyMessage(event.replyToken, {
        type: 'text',
        text: '🤖 抱歉，我現在無法正確理解您的訊息。請稍後再試或輸入「幫助」查看可用功能。'
      });
    }
    
  } catch (err) {
    console.error('handleEvent 錯誤:', err);
    
    // 錯誤處理 - 向用戶發送友好的錯誤訊息
    // Error handling - send friendly error message to user
    if (event.replyToken) {
      return safeReplyMessage(event.replyToken, {
        type: 'text',
        text: '😅 抱歉，系統發生錯誤，請稍後再試！\n輸入「幫助」查看可用功能。'
      });
    }
  }
}

// Express 中間件設置
// Express middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// LINE Bot Webhook 端點
// LINE Bot webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('收到 Webhook 請求');
  
  // 如果沒有有效的 LINE Bot 配置，返回錯誤
  // If no valid LINE Bot configuration, return error
  if (!hasValidConfig) {
    console.log('⚠️ 缺少 LINE Bot 配置，無法處理 Webhook');
    return res.status(400).json({ error: 'Missing LINE Bot configuration' });
  }
  
  // 使用 LINE SDK 中間件處理請求
  // Use LINE SDK middleware to handle requests
  line.middleware(config)(req, res, () => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => {
        console.log('處理結果:', result);
        res.json(result);
      })
      .catch((err) => {
        console.error('Webhook 處理錯誤:', err);
        res.status(500).end();
      });
  });
});

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
      geminiApiKey: !!process.env.GEMINI_API_KEY
    },
    features: {
      taskManagement: true,
      aiConversation: true,
      webSearch: true,
      quickReply: hasValidConfig,
      geminiAI: enableAIFeatures && !!process.env.GEMINI_API_KEY
    }
  });
});

// 根路徑
// Root path
app.get('/', (req, res) => {
  const configStatus = hasValidConfig ? 
    '<span style="color: green;">✅ 已配置</span>' : 
    '<span style="color: red;">❌ 未配置</span>';
  
  const geminiStatus = (enableAIFeatures && process.env.GEMINI_API_KEY) ? 
    '<span style="color: green;">✅ 已啟用</span>' : 
    '<span style="color: red;">❌ 未啟用</span>';
    
  res.send(`
    <h1>🤖 LINE Bot 增強版</h1>
    <p>LINE Bot 配置狀態：${configStatus}</p>
    <p>Gemini AI 狀態：${geminiStatus}</p>
    <p>功能包括：</p>
    <ul>
      <li>📋 任務管理</li>
      <li>🤖 ${(enableAIFeatures && process.env.GEMINI_API_KEY) ? 'Gemini AI 對話' : 'AI 對話'}</li>
      <li>🔍 網路搜索</li>
      <li>⚡ 快速回覆按鈕 ${hasValidConfig ? '(已啟用)' : '(需要 LINE Bot 配置)'}</li>
    </ul>
    <p>狀態：<a href="/health">健康檢查</a></p>
    ${!hasValidConfig ? '<p style="color: red;">⚠️ 請設置 CHANNEL_ACCESS_TOKEN 和 CHANNEL_SECRET 環境變數以啟用 LINE Bot 功能</p>' : ''}
    ${!(enableAIFeatures && process.env.GEMINI_API_KEY) ? '<p style="color: orange;">⚠️ 請設置 GEMINI_API_KEY 環境變數並將 ENABLE_AI_FEATURES 設為 true 以啟用 Gemini AI</p>' : ''}
  `);
});

// 啟動服務器
// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 LINE Bot 服務器已啟動在端口 ${port}`);
  console.log(`📋 功能：任務管理、${(enableAIFeatures && process.env.GEMINI_API_KEY) ? 'Gemini AI 對話' : 'AI 對話'}、網路搜索、快速回覆`);
  console.log(`🔗 Webhook URL: /webhook`);
  console.log(`❤️ 健康檢查: /health`);
  
  if (hasValidConfig) {
    console.log(`✅ LINE Bot 配置正常`);
  } else {
    console.log(`⚠️ 缺少 LINE Bot 配置 - 請設置 CHANNEL_ACCESS_TOKEN 和 CHANNEL_SECRET 環境變數`);
    console.log(`📝 參考 .env.example 文件創建 .env 配置文件`);
  }
  
  if (enableAIFeatures && process.env.GEMINI_API_KEY) {
    console.log(`✅ Gemini AI 配置正常`);
  } else if (enableAIFeatures) {
    console.log(`⚠️ Gemini AI 已啟用但缺少 API 密鑰 - 請設置 GEMINI_API_KEY 環境變數`);
  } else {
    console.log(`ℹ️ Gemini AI 功能未啟用 - 設置 ENABLE_AI_FEATURES=true 以啟用`);
  }
});

// 優雅關閉處理
// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('正在關閉服務器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('正在關閉服務器...');
  process.exit(0);
});