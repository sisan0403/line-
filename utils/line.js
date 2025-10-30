/**
 * utils/line.js
 * - build messages (text / Flex)
 * - handles simple zh / en text
 */

export function buildStatusText(rows, { lang="zh" } = {}) {
  const isZh = (lang === "zh");
  if (!rows || rows.length < 1) {
    return { type: "text", text: isZh ? "目前沒有任務。" : "No tasks found." };
  }
  const lines = rows.slice(0, 20).map(r => {
    const name = r[0] || "未命名";
    const owner = r[1] || "未知";
    const status = r[2] || "進行中";
    const deadline = r[3] || "-";
    return `• ${name} — ${owner} — ${status} — ${deadline}`;
  }).join("\n");
  return { type: "text", text: lines };
}

export function buildTaskFlex(task, owner, status, deadline) {
  const progress = status === "完成" ? 100 : 50;
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: task, weight: "bold", size: "lg" },
        { type: "text", text: `👤 ${owner}  ⏰ ${deadline}` },
        { type: "text", text: `進度：${progress}%` }
      ]
    }
  };
}