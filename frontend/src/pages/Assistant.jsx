import React, { useState } from "react";
import axios from "axios";
import { Bot, Send, Sparkles } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const Assistant = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello. Ask me about using the hostel management system, its roles, maintenance, billing, rooms, or notifications.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

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
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <header className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-emerald-700 p-2 text-white">
          <Bot size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hostel assistant</h1>
          <p className="text-sm text-gray-600">
            Help with the hostel management system
          </p>
        </div>
      </header>

      <section className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <Sparkles size={16} className="text-emerald-700" />
          Replies come from approved system answers. Gemini cannot write
          free-form replies or access live records.
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto p-4"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-emerald-800 text-white"
                    : "border border-gray-200 bg-gray-50 text-gray-800"
                }`}
              >
                {message.text}
              </p>
            </div>
          ))}
          {loading && (
            <p className="text-sm text-gray-500" role="status">
              Checking the approved help information...
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-200 p-3 sm:p-4"
        >
          <label htmlFor="assistant-question" className="sr-only">
            Ask about the hostel management system
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={1200}
              rows={2}
              placeholder="Ask about roles, maintenance, billing, or rooms..."
              className="min-h-12 flex-1 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={loading || question.trim().length < 2}
              aria-label="Send question"
              title="Send question"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Assistant;
