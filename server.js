// server.js ── 最小穩定版（驗證必過、錯誤不 500）
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function must(k) {
  const v = process.env[k];
  if (!v) {
    console.error(`[FATAL] Missing env: ${k}`);
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

// 健康檢查（可被 UptimeRobot/Ping 喚醒）
app.get('/', (_, res) => res.status(200).send('OK'));

// 驗證時 LINE 可能發 GET 到 /webhook，回 200 即可
app.get('/webhook', (_, res) => res.status(200).send('OK'));

// 真正的 Webhook：一定要用 POST，且放在 middleware 後面
app.post('/webhook', line.middleware(config), (req, res) => {
  // 安全處理：不論成功或失敗，都回 200，避免 500
  const events = (req.body && req.body.events) || [];
  if (!Array.isArray(events) || events.length === 0) {
    // 驗證用 POST 幾乎都是空事件，直接 200
    return res.status(200).end();
  }

  Promise
    .all(events.map(handleEvent))
    .then(() => res.status(200).end())
    .catch(err => {
      console.error('[WEBHOOK_ERROR]', err);
      res.status(200).end(); // 吃掉錯誤，仍回 200
    });
});

// 單一事件處理：目前只回聲（你可再擴充幣價/日文/健身）
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const text = (event.message.text || '').trim();
  return client.replyMessage(event.replyToken, { type: 'text', text: `你說的是：${text}` });
}

// 放最後：啟動（Render 會給 PORT）
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on ${port}`));
