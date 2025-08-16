// server.js
// 讀取 .env
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

// 健康檢查
app.get('/', (_, res) => res.send('OK'));

// ✅ 讓 LINE 後台按「驗證」時（GET）也回 200
app.get('/webhook', (req, res) => {
  res.status(200).send('OK');
});

// ✅ 真正事件處理（POST）
app.post('/webhook', line.middleware(config), async (req, res, next) => {
  try {
    const events = (req.body && req.body.events) ? req.body.events : [];
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// 最小可行的事件處理：回聲
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return Promise.resolve(null);
  const text = (event.message.text || '').trim();
  return client.replyMessage(event.replyToken, { type: 'text', text: `你說的是：${text}` });
}

// 全域錯誤處理
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).end();
});

// 最後再監聽（Render 用動態 PORT）
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on ${port}`));
