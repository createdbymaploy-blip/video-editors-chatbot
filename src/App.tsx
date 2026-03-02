import { useEffect, useState } from 'react';
import { Bot, MessageSquare, Database, Activity, AlertCircle } from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

interface BotInfo {
  status: string;
  botInfo?: {
    username: string;
    first_name: string;
  };
  message?: string;
}

export default function App() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/faqs').then(res => res.json()),
      fetch('/api/bot-info').then(res => res.json())
    ])
      .then(([faqsData, botData]) => {
        setFaqs(faqsData);
        setBotInfo(botData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Bot className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Telegram AI Assistant</h1>
              <p className="text-zinc-400 text-sm">Automated support for Video Editors Chat</p>
            </div>
          </div>
          
          {botInfo?.status === 'running' ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-sm font-medium border border-emerald-500/20">
              <Activity className="w-4 h-4" />
              <span>@{botInfo.botInfo?.username} is Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full text-sm font-medium border border-red-500/20">
              <AlertCircle className="w-4 h-4" />
              <span>Bot Error: {botInfo?.message || 'Offline'}</span>
            </div>
          )}
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-zinc-400 mb-2">
              <Database className="w-5 h-5" />
              <h3 className="font-medium">Knowledge Base</h3>
            </div>
            <p className="text-3xl font-semibold">{faqs.length} <span className="text-lg text-zinc-500 font-normal">Q&A Pairs</span></p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-zinc-400 mb-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-medium">Status</h3>
            </div>
            <p className="text-3xl font-semibold text-emerald-400">Listening</p>
          </div>
        </div>

        {/* Knowledge Base List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-zinc-400" />
            Knowledge Base Entries
          </h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900 h-24 rounded-2xl border border-zinc-800"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {faqs.map(faq => (
                <div key={faq.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
                  <h3 className="text-lg font-medium text-indigo-300 mb-3 flex gap-3">
                    <span className="text-zinc-500 font-mono text-sm mt-1">{String(faq.id).padStart(2, '0')}</span>
                    {faq.question}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed pl-8">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
