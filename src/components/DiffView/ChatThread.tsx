import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatThreadProps {
  findingId: string;
  onClose: () => void;
}

export function ChatThread({ findingId, onClose }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [findingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadHistory() {
    const history = await window.electronAPI.chat.getHistory(findingId);
    setMessages(history);
  }

  async function handleSend() {
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await window.electronAPI.chat.sendMessage(findingId, input);
      const assistantMessage: ChatMessage = {
        id: `temp-${Date.now()}-resp`,
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-border-default rounded-md bg-surface-1 mt-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-border-default">
        <span className="text-xs font-medium text-text-secondary">Discussion</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-xs"
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-48 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm p-2 rounded ${
              msg.role === 'user'
                ? 'bg-accent-blue/10 text-text-primary ml-4'
                : 'bg-surface-2 text-text-secondary mr-4'
            }`}
          >
            <div className="text-xs text-text-muted mb-1">
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-2 border-t border-border-default">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this finding..."
          className="flex-1 bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-2 py-1 rounded text-xs bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
