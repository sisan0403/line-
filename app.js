/**
 * SquadTaskAssistant - LINE Bot (Node.js)
 * - Webhook endpoints for LINE
 * - Google Sheets / Drive integration
 * - Reminder modes: group / personal / all
 *
 * NOTE: This is a starter template. Fill environment variables and
 * place Google service-account JSON as indicated in README.
 */

import express from "express";
import line from "@line/bot-sdk";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { appendTask, readTasks, markDone, ensureSheetInit, ensureTaskFolder, uploadFileToTask } from "./utils/google.js";
import { buildTaskFlex, buildStatusText } from "./utils/line.js";
import { scheduleReminders } from "./utils/reminder.js";

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_SECRET
};

const client = new line.Client(config);
const app = express();

app.use(bodyParser.json());
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    for (const ev of events) {
      await handleEvent(ev);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

async function handleEvent(event) {
  if (event.type !== "message") return;
  const replyToken = event.replyToken;
  const userId = event.source.userId || null;
  const groupId = event.source.groupId || null;
  // basic text commands
  if (event.message.type === "text") {
    const text = event.message.text.trim();
    const parts = text.split(" ");
    const cmd = parts[0].toLowerCase();

    if (cmd === "/add") {
      // /add 任務名稱 截止日期 (YYYY-MM-DD)
      const taskName = parts.slice(1, -1).join(" ") || "未命名任務";
      const deadline = parts[parts.length - 1];
      const owner = event.message.mention ? event.message.mention : null;
      // For simplicity owner is the sender if not specified
      const ownerName = event.source.userId ? ("user:" + userId) : "unknown";
      const row = await appendTask({
        taskName, owner: ownerName, deadline, groupId, creator: userId
      });
      await client.replyMessage(replyToken, { type: "text", text: `✅ 任務已建立！\n${taskName} (${deadline})` });
      return;
    }

    if (cmd === "/status") {
      // /status  (optional) /status me
      const scope = parts[1] === "me" ? "personal" : "group";
      const rows = await readTasks({ groupId, userId, scope });
      const msg = buildStatusText(rows, { lang: process.env.DEFAULT_LANG || "zh" });
      await client.replyMessage(replyToken, msg);
      return;
    }

    if (cmd === "/done") {
      const taskName = parts.slice(1).join(" ");
      const ok = await markDone({ taskName, userId, groupId });
      await client.replyMessage(replyToken, { type: "text", text: ok ? `🎉 已標記 ${taskName} 為完成！` : `找不到任務 ${taskName}` });
      return;
    }

    if (cmd === "/remind") {
      // /remind personal | group | all
      const mode = parts[1] || "personal";
      // Save reminder preference (left as exercise)
      await client.replyMessage(replyToken, { type: "text", text: `🔔 已設定提醒模式：${mode}` });
      return;
    }

    if (cmd === "/upload") {
      await client.replyMessage(replyToken, { type: "text", text: "請直接在此聊天傳送檔案，我會把它放到該任務的 Drive 資料夾。" });
      return;
    }

    // language switch
    if (cmd === "/lang") {
      const lang = parts[1] || "zh";
      await client.replyMessage(replyToken, { type: "text", text: `語言已設定為 ${lang}` });
      return;
    }

    // help
    if (cmd === "/help") {
      const help = "/add 任務 截止\n/status [me]\n/done 任務名稱\n/remind personal|group|all\n/upload\n/lang zh|en";
      await client.replyMessage(replyToken, { type: "text", text: help });
      return;
    }
  }

  // file upload handling
  if (event.message.type === "file" || event.message.type === "image") {
    // locate task by last used task or provided mapping - simplified: user must send caption containing task name
    const taskName = event.message.fileName ? event.message.fileName.split("_",1)[0] : "未知任務";
    // download content
    const stream = await client.getMessageContent(event.message.id);
    const buffer = Buffer.from(await stream.arrayBuffer());
    // create folder and upload
    const fileInfo = await uploadFileToTask({ groupId, taskName, uploaderUserId: userId, fileName: event.message.fileName || `upload_${Date.now()}`, buffer });
    await client.replyMessage(event.replyToken, { type: "text", text: `📁 已上傳: ${fileInfo.webViewLink}` });
    return;
  }
}

// start reminder scheduler (in-memory)
scheduleReminders(client).catch(e => console.error(e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));