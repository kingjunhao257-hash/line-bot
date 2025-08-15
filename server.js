const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function must(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`[FATAL] missing ${key}`);
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

app.post('/webhook', line.middleware(config), async (req, res, next) => {
  try {
    const results = await Promise.all((req.body.events || []).map(handleEvent));
    res.json(results);
  } catch (e) {
    next(e);
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `你說的是：${event.message.text}`
  });
}

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).end();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server listening on ' + port));
