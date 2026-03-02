import { Telegraf } from 'telegraf';
import { GoogleGenAI, Type } from '@google/genai';
import { getAllFaqs, getFaqById } from './db';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8476391517:AAH0TNio2Xr3ZO14J58MEpcLmsCST0oWBDQ';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyArZyDsJpOF89prIuigSST5uOzGFCvL6QI';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
export const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) => {
  ctx.reply('Привет! Я бот-помощник для чата монтажёров. Просто добавь меня в группу, и я буду отвечать на частые вопросы новичков.');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Ignore short messages to save API calls
  if (text.length < 10) return;
  
  // Ignore commands
  if (text.startsWith('/')) return;

  const faqs = getAllFaqs();
  const faqListText = faqs.map(f => `${f.id}. ${f.question}`).join('\n');
  
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
        const faq = getFaqById(result.matched_id);
        if (faq) {
          await ctx.reply(faq.answer, { reply_parameters: { message_id: ctx.message.message_id } });
        }
      }
    }
  } catch (e) {
    console.error("AI Error:", e);
  }
});

// For Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
}
