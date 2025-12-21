// 將此代碼保存為 gemini-test.js 文件
// Save this code as gemini-test.js file
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 檢查環境變數
console.log('GEMINI_API_KEY 存在:', !!process.env.GEMINI_API_KEY);
console.log('ENABLE_AI_FEATURES 設置為:', process.env.ENABLE_AI_FEATURES);

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    console.log('正在測試 Gemini AI...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = "你好，請用繁體中文回答：你是誰？";
    console.log('測試提示:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('Gemini 回應:');
    console.log(response);
    
    console.log('✅ 測試成功!');
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('錯誤詳情:', error);
  }
}

testGemini();