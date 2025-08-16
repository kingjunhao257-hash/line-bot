// server.js ─ 多功能 LINE Bot（幣價 / 日文 / 健身 / 回聲）
// 讀取 .env（Render 與本機皆適用）
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 檢查必要環境變數
function must(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`[FATAL] 缺少環境變數 ${key}；請在 Render 或 .env 設定`);
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

// 健康檢查（讓瀏覽器/UptimeRobot 檢測）
app.get('/', (_, res) => res.send('OK'));

// ─────────────────── Core: Webhook ───────────────────
app.post('/webhook', line.middleware(config), async (req, res, next) => {
  try {
    // 基礎除錯：看得到事件就知道 webhook 有打到
    console.log('[WEBHOOK] events =', JSON.stringify(req.body?.events || []));
    const results = await Promise.all((req.body.events || []).map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('[WEBHOOK_ERROR]', err);
    next(err);
  }
});

// ─────────────────── 指令解析 ───────────────────
// 幣種代號對照（常見）
const SYMBOL_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LTC: 'litecoin',
  MNT: 'mantle',
};

// 日文字庫（先放少量，之後可改讀 Google Sheet）
const JP_BANK = [
  { jp: 'おはよう', kana: 'おはよう', zh: '早安' },
  { jp: 'ありがとう', kana: 'ありがとう', zh: '謝謝' },
  { jp: '頑張って', kana: 'がんばって', zh: '加油' },
  { jp: '勉強する', kana: 'べんきょうする', zh: '學習' },
  { jp: '運動', kana: 'うんどう', zh: '運動' },
];

// 健身菜單（示例）
const FITNESS_PLAN = [
  '深蹲 3 組 × 12 下',
  '伏地挺身 3 組 × 12 下',
  '平板支撐 3 組 × 45 秒',
  '仰臥起坐 3 組 × 15 下',
];

// 解析幣種代號（從文字找出可能的 BTC/ETH…）
function parseSymbol(text) {
  const t = (text || '').toUpperCase().replace(/價格|幣價|查詢|查價|請問|一下|幣/g, ' ');
  const m = t.match(/\b[A-Z0-9.-]{2,10}\b/);
  return m ? m[0] : null;
}

// 抓幣價（CoinGecko；Node 18+ 內建 fetch）
async function fetchPriceUSD(symbolRaw) {
  const symbol = (symbolRaw || '').toUpperCase();
  const id = SYMBOL_MAP[symbol] || symbol.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const json = await res.json();
  const price = json?.[id]?.usd;
  if (typeof price !== 'number') throw new Error('NOT_FOUND');
  return { symbol, id, price };
}

// 事件處理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const text = (event.message.text || '').trim();

  // 1) 幣價查詢：觸發關鍵詞（價格/幣價/查 + 幣種）
  if (/價格|幣價|查/.test(text)) {
    const sym = parseSymbol(text);
    if (!sym) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '請輸入「幣價 BTC」或「價格 ETH」這種格式喔！',
      });
    }
    try {
      const { price } = await fetchPriceUSD(sym);
      const msg = `${sym} 現價：約 $${price.toLocaleString('en-US', { maximumFractionDigits: 8 })} USD`;
      return client.replyMessage(event.replyToken, { type: 'text', text: msg });
    } catch (e) {
      const msg =
        e.message === 'NOT_FOUND'
          ? `找不到幣種代號：${sym}（試試：BTC / ETH / SOL / MNT…）`
          : `查價暫時失敗，稍後再試（${e.message}）`;
      return client.replyMessage(event.replyToken, { type: 'text', text: msg });
    }
  }

  // 2) 日文單字
  if (/日文|單字/.test(text)) {
    const one = JP_BANK[Math.floor(Math.random() * JP_BANK.length)];
    const msg = `今日日文：${one.jp}（${one.kana}）\n意思：${one.zh}`;
    return client.replyMessage(event.replyToken, { type: 'text', text: msg });
  }

  // 3) 健身菜單
  if (/健身|運動/.test(text)) {
    const msg = `今日建議：\n- ${FITNESS_PLAN.join('\n- ')}\n（完成可回「完成 深蹲」等，我再幫你做記錄功能）`;
    return client.replyMessage(event.replyToken, { type: 'text', text: msg });
  }

  // 4) 其他 → 回聲
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `你說的是：${text}`,
  });
}

// 全域錯誤處理
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).end();
});

// 啟動（Render 需用動態 PORT）
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on ${port}`));
