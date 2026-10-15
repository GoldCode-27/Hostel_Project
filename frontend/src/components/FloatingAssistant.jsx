import React, { useState } from "react";
import axios from "axios";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const FloatingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask about using the hostel system, maintenance, rooms, or billing.",
    },
  ]);

  const sendQuestion = async (event) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 2 || loading) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: cleanQuestion },
    ]);
    setQuestion("");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/assistant/chat`,
        { question: cleanQuestion },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error.response?.data?.message ||
            "The assistant is temporarily unavailable. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6 lg:z-[60]">
      {isOpen && (
        <section
          id="floating-assistant-panel"
          aria-label="Hostel assistant chat"
          className="mb-3 flex h-[min(32rem,calc(100dvh-6rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-emerald-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot size={19} />
              <div>
                <h2 className="text-sm font-semibold">Hostel assistant</h2>
                <p className="text-xs text-emerald-100">
                  Approved system answers only
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant chat"
              title="Close assistant chat"
              className="flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/15"
            >
              <X size={18} />
            </button>
          </header>

          <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
            No live room, maintenance, or billing records are available here.
          </div>

          <div
            className="flex-1 space-y-3 overflow-y-auto p-3"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-5 ${
                    message.role === "user"
                      ? "bg-emerald-800 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-gray-500" role="status">
                Checking approved answers...
              </p>
            )}
          </div>

          <form
            onSubmit={sendQuestion}
            className="flex items-center gap-2 border-t border-gray-200 p-3"
          >
            <label htmlFor="floating-assistant-question" className="sr-only">
              Ask the hostel assistant
            </label>
            <input
              id="floating-assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={1200}
              placeholder="Ask a system question..."
              className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={loading || question.trim().length < 2}
              aria-label="Send question"
              title="Send question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="floating-assistant-panel"
        aria-label={isOpen ? "Close assistant chat" : "Open assistant chat"}
        title={isOpen ? "Close assistant chat" : "Open assistant chat"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
};

export default FloatingAssistant;
