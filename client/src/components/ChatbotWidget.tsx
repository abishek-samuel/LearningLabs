import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<
    { sender: "user" | "bot"; text: string }[]
  >([{ sender: "bot", text: "Hi! How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState();
  const [loading, setLoading] = useState(false);  // Loading state
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((msgs) => [...msgs, { sender: "user", text: userText }]);
    setInput("");
    setLoading(true);  // Set loading to true when sending message

    try {
      const res = await fetch("http://127.0.0.1:5002/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          context,
          history: getHistory(),
        }),
      });

      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: data.response },
      ]);
    } catch (err) {
      console.log(err);
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);  // Set loading to false once the response is received
    }
  };

  const getHistory = () => {
    const qaPairs = [];
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].sender === "user" && messages[i + 1]?.sender === "bot") {
        qaPairs.push([messages[i].text, messages[i + 1].text]);
      }
    }
    return qaPairs;
  };

  return (
    <>
      {/* Floating Icon */}
      <button
        aria-label="Open chat"
        className="fixed z-50 bottom-6 right-6 bg-emerald-600 text-white rounded-full p-3 hover:bg-emerald-700"
        onClick={() => setOpen(true)}
        hidden={open}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chatbox */}
      {open && (
        <div className="fixed z-50 bottom-6 right-6 w-[28rem] max-w-[95vw] h-[32rem] bg-white border rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex justify-between px-4 py-2 bg-emerald-600 text-white rounded-t-xl">
            <span className="font-semibold">Chatbot</span>
            <button onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-slate-50 chatbot-scrollbar">
            {messages.map((msg, i) => (
              <div
                key={msg.text}
                className={msg.sender === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`px-3 py-2 rounded-lg max-w-[80%] text-sm whitespace-pre-wrap ${msg.sender === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-900"
                    }`}
                >
                  {msg.sender === "bot" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ node, inline, className, children, ...props }) => {
                          return inline ? (
                            <code
                              className="text-emerald-600 bg-slate-100 rounded px-1"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-gray-800 p-3 rounded-md my-2 overflow-auto">
                              <code className="text-white">{children}</code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {/* Show loading message when bot is processing */}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg max-w-[80%] text-sm whitespace-pre-wrap bg-gray-300 text-gray-700">
                  <span className="typing-animation"></span>
                </div>
              </div>
            )}


            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="flex items-center border-t px-2 py-2 bg-white"
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 outline-none px-2 py-1 text-sm text-slate-900"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="ml-2 px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!input.trim()}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}

      {/* Scrollbar styling */}
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
           .typing-animation::after {
    content: '.';
    animation: typing 1.5s steps(5, end) infinite;
  }

  @keyframes typing {
    0% {
      content: 'typing';
    }
    20% {
      content: 'typing.';
    }
    40% {
      content: 'typing..';
    }
    60% {
      content: 'typing...';
    }
    80% {
      content: 'typing..';
    }
    100% {
      content: 'typing.';
    }
  }
      `}</style>
    </>
  );
}
