/**
 * utils/reminder.js
 * - simple in-process scheduler that checks Google Sheet every X minutes
 * - For production, use Cloud Scheduler or CRON + a dedicated endpoint.
 */
import cron from "node-cron";
import { readTasks } from "./google.js";

export async function scheduleReminders(lineClient) {
  // every 10 minutes for demo - adjust as needed
  cron.schedule("*/10 * * * *", async () => {
    try {
      const rows = await readTasks();
      const now = new Date();
      for (const r of (rows || [])) {
        // sample: r[0]=taskName, r[2]=status, r[3]=deadline, r[5]=groupId
        const taskName = r[0];
        const status = r[2];
        const deadline = r[3];
        const groupId = r[5];
        if (!deadline) continue;
        const d = new Date(deadline);
        const diffDays = Math.ceil((d - now) / (1000*60*60*24));
        if (diffDays <= 1 && status !== "完成") {
          // push to group (if groupId) or skip
          if (groupId) {
            await lineClient.pushMessage(groupId, { type: "text", text: `⏰ 提醒：任務 "${taskName}" 明天截止`});
          }
        }
      }
    } catch (e) {
      console.error("reminder error", e);
    }
  }, {scheduled:true});
}