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

app.use(express.json());

// 記憶體任務資料 { '2025-08-16': { 日文: { done: true/false, note: "" }, ... } }
const tasks = {};
const taskNames = ['日文', '健身', '閱讀'];

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 初始化今日任務
function initTasks(dateStr) {
  if (!tasks[dateStr]) {
    tasks[dateStr] = {};
    taskNames.forEach(name => {
      tasks[dateStr][name] = { done: false, note: '' };
    });
  }
}

// 推播（手動觸發，正式排程可用 cron）
async function pushTodayTask(userId) {
  if (!userId) throw new Error('userId 不存在，不能推播');
  const today = getToday();
  initTasks(today);
  return client.pushMessage(userId, {
    type: 'template',
    altText: '今日任務',
    template: {
      type: 'buttons',
      title: '今日任務',
      text: '請回報完成情況',
      actions: taskNames.map(name => ({
        type: 'message',
        label: `${name}完成`,
        text: `完成 ${name}`
      }))
    }
  });
}

// Webhook 處理：空 events 直接回 200，其餘照常處理
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  // 如果 events 為空陣列（如 LINE 驗證），直接回 200
  if (!events || events.length === 0) {
    return res.status(200).json({ status: 'ok (no events)' });
  }
  try {
    await Promise.all(events.map(event => handleEvent(event)));
    res.json({ status: 'ok' }); // 一定回200
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ status: 'error', message: err.message }); // LINE 只需要200
  }
});

async function handleEvent(event) {
  try {
    if (event.type !== 'message') return null;

    // 只處理文字訊息
    if (event.message.type !== 'text') return null;
    const text = event.message.text.trim();
    const today = getToday();
    initTasks(today);

    // 完成任務指令
    const doneMatch = text.match(/^完成\s*(日文|健身|閱讀)$/);
    if (doneMatch) {
      const name = doneMatch[1];
      tasks[today][name].done = true;
      return client.replyMessage(event.replyToken, { type: 'text', text: `${name}已標記完成！` });
    }

    // 備註指令
    const noteMatch = text.match(/^備註\s*(日文|健身|閱讀)\s*(.+)$/);
    if (noteMatch) {
      const name = noteMatch[1];
      const note = noteMatch[2];
      tasks[today][name].note = note;
      return client.replyMessage(event.replyToken, { type: 'text', text: `已記錄備註：${name}-${note}` });
    }

    // 查詢指令
    const queryMatch = text.match(/^查詢\s*(\d{1,2})\/(\d{1,2})$/);
    if (queryMatch) {
      const month = queryMatch[1].padStart(2, '0');
      const day = queryMatch[2].padStart(2, '0');
      const year = (new Date()).getFullYear();
      const dateStr = `${year}-${month}-${day}`;
      if (!tasks[dateStr]) {
        return client.replyMessage(event.replyToken, { type: 'text', text: `${dateStr} 尚無資料` });
      }
      let msg = `${dateStr} 任務狀態：\n`;
      taskNames.forEach(name => {
        const t = tasks[dateStr][name];
        msg += `${name}：${t.done ? '完成' : '未完成'}${t.note ? `，備註：${t.note}` : ''}\n`;
      });
      return client.replyMessage(event.replyToken, { type: 'text', text: msg });
    }

    // 查詢今日
    if (text === '今天任務' || text === '任務狀態') {
      let msg = `${today} 任務狀態：\n`;
      taskNames.forEach(name => {
        const t = tasks[today][name];
        msg += `${name}：${t.done ? '完成' : '未完成'}${t.note ? `，備註：${t.note}` : ''}\n`;
      });
      return client.replyMessage(event.replyToken, { type: 'text', text: msg });
    }

    // 手動推播（你自己在聊天室打 "推播" 來測試）
    if (text === '推播') {
      const userId = event.source.userId;
      if (!userId) {
        return client.replyMessage(event.replyToken, { type: 'text', text: '推播只能在個人聊天使用！' });
      }
      await pushTodayTask(userId);
      return client.replyMessage(event.replyToken, { type: 'text', text: '已推播今日任務按鈕！' });
    }

    // echo
    return client.replyMessage(event.replyToken, { type: 'text', text: `你說的是：${text}` });
  } catch (err) {
    console.error('handleEvent error:', err);
    if (event.replyToken) {
      return client.replyMessage(event.replyToken, { type: 'text', text: '發生錯誤，請稍後再試！' });
    }
  }
}

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on ${process.env.PORT || 3000}`)
);