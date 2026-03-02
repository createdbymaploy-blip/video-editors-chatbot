import { Telegraf } from 'telegraf';
import { GoogleGenAI, Type } from '@google/genai';
import { getAllFaqs, getFaqById } from './db';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8476391517:AAH0TNio2Xr3ZO14J58MEpcLmsCST0oWBDQ';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyArZyDsJpOF89prIuigSST5uOzGFCvL6QI';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
export const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) => {
  console.log("Received /start command from:", ctx.from.username || ctx.from.id);
  ctx.reply('Привет! Я бот-помощник для чата монтажёров. Просто добавь меня в группу, и я буду отвечать на частые вопросы новичков.');
});

bot.on('message', async (ctx, next) => {
  console.log(`[Bot Debug] Received ANY message type in chat ${ctx.chat?.id}`);
  
  // If it's a text message, process it
  if ('text' in ctx.message) {
    const text = ctx.message.text;
    console.log(`[Bot] Received text message: "${text}" from ${ctx.from.username || ctx.from.id} in chat ${ctx.chat.id}`);
    
    // Ignore short messages to save API calls
    if (text.length < 10) {
      console.log("[Bot] Message too short, ignoring.");
      return next();
    }
    
    // Ignore commands
    if (text.startsWith('/')) {
      console.log("[Bot] Message is a command, ignoring.");
      return next();
    }

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
      console.log("[Bot] Sending request to Gemini AI...");
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
        console.log("[Bot] Received response from Gemini:", response.text);
        const result = JSON.parse(response.text);
        if (result.matched_id) {
          const faq = getFaqById(result.matched_id);
          if (faq) {
            console.log(`[Bot] Match found! Replying with FAQ #${faq.id}`);
            await ctx.reply(faq.answer, { reply_parameters: { message_id: ctx.message.message_id } });
          } else {
            console.log(`[Bot] Gemini returned ID ${result.matched_id}, but it was not found in DB.`);
          }
        } else {
          console.log("[Bot] Gemini determined this is not an FAQ.");
        }
      }
    } catch (e) {
      console.error("[Bot] AI Error:", e);
    }
  }
  
  return next();
});

export function startBot() {
  // We no longer launch the bot here via long polling.
  // Vercel will handle incoming requests via Webhooks.
  console.log("Telegram bot is configured for Webhooks (Vercel).");
}
