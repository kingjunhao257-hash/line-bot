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

app.get('/', (_, res) => res.send('OK'));
app.get('/webhook', (_, res) => res.send('OK'));

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

// 指令回覆：幣價 / 健身 / 日文
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const text = event.message.text.trim();

  if (text === '幣價') {
    // 假資料，你可改串即時 API
    return client.replyMessage(event.replyToken, { type: 'text', text: '目前 BTC 約 $65,000（假資料）' });
  } else if (text === '健身') {
    return client.replyMessage(event.replyToken, { type: 'text', text: '今天建議做 20 分鐘有氧 + 伏地挺身 3 組！' });
  } else if (text === '日文') {
    return client.replyMessage(event.replyToken, { type: 'text', text: 'こんにちは (Konnichiwa) → 你好' });
  } else {
    return client.replyMessage(event.replyToken, { type: 'text', text: `你說的是：${text}` });
  }
}

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on ${process.env.PORT || 3000}`)
);