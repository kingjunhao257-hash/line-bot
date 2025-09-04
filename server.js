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
      console.log('🔄 正在使用 Gemini AI 處理訊息:', text);
      
      // 使用 Gemini 進行回應
      // Use Gemini for response
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
      你是一個LINE聊天機器人助手，請用50字以內簡短回答以下訊息。
      使用友善、活潑的口吻並加上合適的emoji。
      回答要簡潔、友好且有幫助。
      
      用戶訊息: ${text}
      `;
      
      console.log('📤 發送給 Gemini 的提示:', prompt);
      
      const result = await model.generateContent(prompt);
      console.log('📥 收到 Gemini 回應:', result);
      
      if (!result || !result.response) {
        console.error('❌ Gemini 回應格式錯誤:', result);
        throw new Error('Gemini response format error');
      }
      
      const response = result.response.text();
      console.log('✅ Gemini 處理後的回應:', response);
      
      return response.trim();
      
    } catch (error) {
      console.error('❌ Gemini AI API 錯誤:', error.message);
      console.error('錯誤詳情:', error);
      
      // 返回帶有錯誤信息的回應，以便於排查
      // Return response with error information for troubleshooting
      if (process.env.NODE_ENV === 'development') {
        return `🛑 Gemini AI 遇到問題: ${error.message}\n\n使用備用回應系統...`;
      }
      
      // 在生產環境中，默默使用備用回應系統
      // In production, silently use fallback response system
    }
  } else {
    console.log('⚠️ Gemini AI 未啟用或初始化失敗，使用備用回應系統');
    console.log('enableAIFeatures:', enableAIFeatures);
    console.log('genAI 已初始化:', !!genAI);
  }
  
  // 如果未啟用 AI 功能或 API 錯誤，使用原有的回應系統
  // If AI is not enabled or API error, use original response system
  
  // 檢查問候語
  // Check greetings
  if (lowerText.includes('你好') || lowerText.includes('hi') || lowerText.includes('hello') || 
      lowerText.includes('嗨') || lowerText.includes('哈囉')) {
    return aiResponses.greeting[Math.floor(Math.random() * aiResponses.greeting.length)];
  }
  
  // 其餘代碼保持不變...
  // The rest of the code remains unchanged...
}

// 這段代碼需要放在路由定義部分，不是在 getAIResponse 函數內部
// This code should be placed in the routing definition section, not inside the getAIResponse function

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

// 添加 Gemini AI 測試端點
// Add Gemini AI test endpoint
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
      stack: error.stack,
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
  // 原有的根路徑處理代碼...
});