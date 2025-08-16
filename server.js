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

// 剩餘程式碼 ……（日文、幣價、健身模組）
// 確保括號、引號成對且沒有亂碼
app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on ${process.env.PORT || 3000}`)
);
