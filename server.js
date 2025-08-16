// 在 handleEvent 函數中加入新的編輯指令處理
async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') return null;
    
    const text = event.message.text.trim();
    const today = getToday();
    initTasks(today);

    // ... 原有的程式碼 ...

    // 新增：取消完成指令
    const undoMatch = text.match(/^取消\s*(日文|健身|閱讀)$/);
    if (undoMatch) {
      const name = undoMatch[1];
      tasks[today][name].done = false;
      return client.replyMessage(event.replyToken, { 
        type: 'text', 
        text: `已取消${name}的完成標記！` 
      });
    }

    // 新增：清除備註指令
    const clearNoteMatch = text.match(/^清除備註\s*(日文|健身|閱讀)$/);
    if (clearNoteMatch) {
      const name = clearNoteMatch[1];
      tasks[today][name].note = '';
      return client.replyMessage(event.replyToken, { 
        type: 'text', 
        text: `已清除${name}的備註！` 
      });
    }

    // ... 其他原有的程式碼 ...
  } catch (err) {
    console.error('handleEvent error:', err);
    if (event.replyToken) {
      return client.replyMessage(event.replyToken, { 
        type: 'text', 
        text: '發生錯誤，請稍後再試！' 
      });
    }
  }
}