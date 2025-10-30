/**
 * utils/google.js
 * - helper functions for Google Sheets and Drive
 * - uses googleapis with service account JSON
 *
 * NOTE: this is a compact, illustrative implementation.
 * You must provide a valid service-account JSON and set GOOGLE_SERVICE_ACCOUNT_FILE env.
 */
import fs from "fs";
import { google } from "googleapis";
import path from "path";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets"
];

function getAuthClient() {
  const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "service-account.json";
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: SCOPES
  });
  return auth;
}

export async function appendTask({ taskName, owner, deadline, groupId, creator }) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const values = [[taskName, owner, "進行中", deadline, "", groupId || "", creator || ""]];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "Tasks!A:G",
    valueInputOption: "RAW",
    requestBody: { values }
  });
  // create folder for task
  const folderId = await ensureTaskFolder(taskName);
  return { taskName, folderId };
}

export async function readTasks({ groupId, userId, scope } = {}) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Tasks!A:G"
  });
  const rows = res.data.values || [];
  // simple filter mock
  return rows;
}

export async function markDone({ taskName, userId, groupId }) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Tasks!A:G"
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === taskName) {
      const rowIndex = i + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range: `Tasks!C${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [["完成"]] }
      });
      return true;
    }
  }
  return false;
}

export async function ensureTaskFolder(taskName) {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const root = process.env.ROOT_DRIVE_FOLDER_ID;
  // search existing
  const q = `name='${taskName}' and '${root}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`;
  const res = await drive.files.list({ q, fields: "files(id,name)" });
  if (res.data.files && res.data.files.length) return res.data.files[0].id;
  const file = await drive.files.create({
    requestBody: {
      name: taskName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [root]
    }
  });
  return file.data.id;
}

export async function uploadFileToTask({ groupId, taskName, uploaderUserId, fileName, buffer }) {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const folderId = await ensureTaskFolder(taskName);
  const prefixedName = `${uploaderUserId || "user"}_${fileName}`;
  const res = await drive.files.create({
    requestBody: {
      name: prefixedName,
      parents: [folderId]
    },
    media: {
      mimeType: 'application/octet-stream',
      body: Buffer.from(buffer)
    },
    fields: 'id,webViewLink,webContentLink'
  });
  return res.data;
}