import { google } from 'googleapis';

const TOKEN = "7991590846:AAHp6H7VW_dPhH3tf_zAjTj8aQSCYZcm6iU";
const ADMIN_CHAT_IDS = [935264202];
const SPREADSHEET_ID = "1utCG8rmf449THR5g6SHvSK4pp6-nj7UEgSgP4H1_isc";

const SERVICE_ACCOUNT = {
  "type": "service_account",
  "project_id": "kaf-471314",
  "private_key_id": "5a6f71bc00b6b29c61642fc35de7d505d34e2dcf",
  "private_key": process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": "id-22-bot@kaf-471314.iam.gserviceaccount.com",
  "client_id": "118228097079633655651",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/id-22-bot%40kaf-471314.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, callback_query } = req.body;

  if (!message && !callback_query) return res.status(200).json({ ok: true });

  // 📥 Обработка текстовых сообщений
  if (message && message.text) {
    const chatId = message.chat.id;
    const text = message.text;

    if (text === "/start") {
      const keyboard = {
        inline_keyboard: [
          [{ text: "🎖️ Военный", callback_data: "type_military" }],
          [{ text: "👔 Гражданский", callback_data: "type_civil" }]
        ]
      };
      await sendText(chatId, "👋 Привет! Пожалуйста, выберите ваш тип:", keyboard);
      return res.status(200).json({ ok: true });
    }
  }

  // 🎯 Обработка нажатий кнопок
  if (callback_query) {
    const chatId = callback_query.message.chat.id;
    const data = callback_query.data;
    const name = callback_query.from.first_name || "Аноним";

    if (data === 'type_military' || data === 'type_civil') {
      const type = data === 'type_military' ? 'military' : 'civil';
      await saveEmployee(chatId, name, type);
      await sendText(chatId, `✅ Вы выбрали: ${type === 'military' ? 'Военный' : 'Гражданский'}.`);
      return res.status(200).json({ ok: true });
    }
  }

  res.status(200).json({ ok: true });
}

async function sendText(chatId, text, replyMarkup = null) {
  let url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}`;
  if (replyMarkup) {
    url += `&reply_markup=${encodeURIComponent(JSON.stringify(replyMarkup))}`;
  }
  await fetch(url, { method: 'GET' });
}

async function saveEmployee(chatId, name, type) {
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT.client_email,
    key: SERVICE_ACCOUNT.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  await auth.authorize();

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A:A',
  });

  const values = response.data.values || [];

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] == chatId) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `C${i + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[type]]
        }
      });
      return;
    }
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A:C',
    valueInputOption: 'RAW',
    resource: {
      values: [[chatId, name, type]]
    }
  });
}


