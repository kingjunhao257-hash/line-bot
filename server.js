const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function must(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`[FATAL] 環境變數 ${key} 未設定`);
    process.exit(1);
  }
  return v;
}

const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: must('CHANNEL_ACCESS_TOKEN'),
  channelSecret: must('CHANNEL_SECRET'),
};

const app = express();
const client = new line.Client(config);

// 基本路由，確保存活
app.get('/', (_, res) => res.send('OK'));

// 使用 JSON parser
app.use(express.json());

// Webhook 驗證用路由
app.get('/webhook', (_, res) => res.send('OK'));

// 主要的 Webhook 處理
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body));
  
  // 1. 先回傳 200 給 LINE
  res.status(200).json({ status: 'ok' });
  
  // 2. 再處理事件
  if (req.body.events && req.body.events.length > 0) {
    Promise.all(req.body.events.map(handleEvent))
      .catch(err => console.error('Handle event error:', err));
  }
});

// ... 其他程式碼保持不變 ...

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on ${process.env.PORT || 3000}`)
);