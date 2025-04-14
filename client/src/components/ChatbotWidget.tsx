import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Send } from "lucide-react";

// Floating chatbot widget for course-content page
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Hi! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Simulate bot reply
  const sendMessage = (text: string) => {
    setMessages((msgs) => [...msgs, { sender: "user", text }]);
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "This is a demo chatbot. (No backend connected)" }
      ]);
    }, 600);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <>
      {/* Floating chat icon */}
      <button
        aria-label="Open chat"
        className="fixed z-50 bottom-6 right-6 bg-emerald-600 dark:bg-emerald-500 text-white rounded-full shadow-lg p-3 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
        style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.12)" }}
        onClick={() => setOpen(true)}
        hidden={open}
      >
        <Sparkles className="h-6 w-6" />
      </button>
      {/* Chat window */}
      {open && (
        <div
          className="fixed z-50 bottom-6 right-6 w-[28rem] max-w-[95vw] h-[32rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col"
          style={{ boxShadow: "0 8px 32px 0 rgba(0,0,0,0.18)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-emerald-600 dark:bg-emerald-500 rounded-t-xl">
            <span className="text-white font-semibold">Chatbot</span>
            <button
              aria-label="Close chat"
              className="text-white hover:text-emerald-200"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-slate-50 dark:bg-slate-900 chatbot-scrollbar">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.sender === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    "px-3 py-2 rounded-lg max-w-[80%] text-sm " +
                    (msg.sender === "user"
                      ? "bg-emerald-600 text-white dark:bg-emerald-500"
                      : "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100")
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <form
            className="flex items-center border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl px-2 py-2"
            onSubmit={handleSend}
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent outline-none px-2 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(e); }}
              autoFocus
            />
            <button
              type="submit"
              className="ml-2 px-3 py-1 rounded bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors flex items-center justify-center"
              disabled={!input.trim()}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
      <style jsx global>{`
        .chatbot-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #a3a3a3 #f1f5f9;
        }
        .chatbot-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb {
          background: #a3a3a3;
          border-radius: 6px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .chatbot-scrollbar::-webkit-scrollbar-button {
          display: none;
          height: 0;
          width: 0;
        }
        .dark .chatbot-scrollbar {
          scrollbar-color: #52525b #0f172a;
        }
        .dark .chatbot-scrollbar::-webkit-scrollbar-thumb {
          background: #52525b;
        }
        .dark .chatbot-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
      `}</style>
    </>
  );
}
