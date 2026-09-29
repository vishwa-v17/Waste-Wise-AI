import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import {
  Sparkles,
  Send,
  Search,
  Bot,
  User as UserIcon,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Clock,
  ArrowRight
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AiAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I am **WasteWise AI**, your grounded decision-support assistant. " +
        "I monitor your food inventory, compute ML demand forecasts, and track shelf-life risks in real-time.\n\n" +
        "How can I assist your kitchen or store today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // NL Search Tab
  const [nlQuery, setNlQuery] = useState('');
  const [nlResult, setNlResult] = useState<any>(null);
  const [nlLoading, setNlLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res: any = await api.post('/ai/chat', {
        message: query,
        history: messages.slice(-6),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Apologies, I encountered an error communicating with the decision engine: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNlSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim() || nlLoading) return;
    setNlLoading(true);
    try {
      const res: any = await api.post('/ai/search', { query: nlQuery });
      setNlResult(res);
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setNlLoading(false);
    }
  };

  const promptShortcuts = [
    'What should I use today?',
    'Which items are most likely to be wasted?',
    'Why is Whole Milk high risk?',
    'How can I reduce this month\'s waste?',
    'What should I buy less of?',
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Ask WasteWise AI</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Grounded conversational decision assistant and natural language inventory intelligence.
        </p>
      </div>

      {/* Natural Language Query Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Search className="w-3.5 h-3.5 text-emerald-600" />
          <span>Natural Language Inventory Search</span>
        </span>

        <form onSubmit={handleNlSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Try: 'Show me food expiring this week' or 'Which vegetables should I use today?'"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={nlLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {nlLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Matched Items from NL Query */}
        {nlResult && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>Interpreted Intent: {nlResult.interpreted_intent}</span>
              <span className="text-emerald-700">{nlResult.matched_items.length} items found</span>
            </div>

            {nlResult.matched_items.length === 0 ? (
              <p className="text-slate-400 text-xs py-1">No items matched this condition.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {nlResult.matched_items.map((item: any) => (
                  <div key={item.item_id || item.id} className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block">{item.product_name}</span>
                    <span className="text-[10px] text-slate-500">
                      Stock: {item.quantity} {item.unit} | Expiry: {item.days_to_expiry <= 0 ? 'Today' : `${item.days_to_expiry}d`}
                    </span>
                    <span className="block mt-1 text-[10px] font-bold text-red-600">
                      Risk: {item.waste_risk_score}/100 ({item.risk_level})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Chat History */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-tr-none shadow-sm'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none prose prose-xs'
                }`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span>Analyzing inventory & ML models...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Shortcuts / Suggestion Chips */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 flex items-center">
            <Lightbulb className="w-3 h-3 mr-1 text-amber-500" /> Prompts:
          </span>
          {promptShortcuts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 shrink-0 transition-colors shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask anything about expiries, what to cook today, or why an item is high risk..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
