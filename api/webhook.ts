import { Telegraf } from 'telegraf';
import { GoogleGenAI, Type } from '@google/genai';
import { seedData } from '../src/server/seedData';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8476391517:AAH0TNio2Xr3ZO14J58MEpcLmsCST0oWBDQ';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyArZyDsJpOF89prIuigSST5uOzGFCvL6QI';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
export const bot = new Telegraf(TELEGRAM_TOKEN);

// ВАЖНО: В serverless (Vercel) мы ОБЯЗАНЫ использовать async/await для всех ответов (ctx.reply),
// иначе Vercel "убьет" процесс до того, как сообщение успеет отправиться в Telegram.
bot.start(async (ctx) => {
  await ctx.reply('привет! я бот-помощник для чата монтажёров. просто добавь меня в группу, и я буду отвечать на частые вопросы новичков.');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Игнорируем короткие сообщения
  if (text.length < 10) return;
  
  // Игнорируем команды
  if (text.startsWith('/')) return;

  const faqListText = seedData.map(f => `${f.id}. ${f.question}`).join('\n');
  
  const prompt = `You are a helpful assistant in a chat for video editors.
Your task is to analyze the following user message and determine if it is asking a question that matches one of our FAQ items.

FAQ Items:
${faqListText}

User message: "${text}"

If the user is asking about one of these topics, return its ID. If not, return null.
Respond strictly in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matched_id: { type: Type.NUMBER, description: "The ID of the matched FAQ, or null if no match" }
          }
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      if (result.matched_id) {
        const faq = seedData.find(f => f.id === result.matched_id);
        if (faq) {
          // Обязательно await
          await ctx.reply(faq.answer.toLowerCase(), { reply_parameters: { message_id: ctx.message.message_id } });
        }
      }
    }
  } catch (e) {
    console.error("AI Error:", e);
  }
});

// Vercel Serverless Handler
export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      // Убеждаемся, что тело запроса распарсено
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Ждем, пока бот полностью обработает сообщение и отправит ответ
      await bot.handleUpdate(body);
      
      // Только после этого закрываем соединение
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling update:', error);
      // Всегда возвращаем 200 в Telegram, иначе он будет бесконечно спамить одними и теми же сообщениями
      res.status(200).send('OK');
    }
  } else {
    res.status(200).send('Bot is running on Vercel!');
  }
}
