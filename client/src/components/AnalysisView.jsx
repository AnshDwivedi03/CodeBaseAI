import React, { useEffect, useState } from 'react';

const MarkdownText = ({ text }) => {
  if (!text) return null;
  
  // 1. Handle line-based formatting (bullets)
  const lines = text.split('\n').map(line => {
    // Replace '* ' or '- ' at the start with a dot '•'
    return line.replace(/^(\s*)[*-]\s+/, '$1• ');
  });

  const processedText = lines.join('\n');

  // 2. Handle inline formatting (bold and backticks)
  // Split by both **bold** and `code`
  const parts = processedText.split(/(\*\*.*?\*\*|`.*?`)/g);
  
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <span key={i} className="inline-code-clean">{part.slice(1, -1)}</span>;
        }
        return part;
      })}
    </div>
  );
};

const Typewriter = ({ text, speed = 15 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (text) {
      setDisplayedText('');
      setIndex(0);
    }
  }, [text]);

  useEffect(() => {
    if (text && index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  return <MarkdownText text={displayedText + (index < text.length ? '|' : '')} />;
};

const AnalysisView = ({ repoUrl, question, setQuestion, handleQuery, querying, messages }) => {
  const summaryRequestedRef = React.useRef(false);
  const scrollRef = React.useRef(null);

  const getRepoName = (url) => {
    if (!url) return '';
    const parts = url.replace(/\/$/, '').split('/');
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
    return url;
  };

  const repoName = getRepoName(repoUrl);

  useEffect(() => {
    if (repoUrl && messages.length === 0 && !querying && !summaryRequestedRef.current) {
      summaryRequestedRef.current = true;
      handleQuery('Provide a concise technical summary (max 150 words) of this repository. Use strong bullet points for architecture and purpose.', true);
    }
  }, [repoUrl, messages.length, querying, handleQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, querying]);

  return (
    <div className="codebase-chat-container animate">
      <div className="chat-scroll-area" ref={scrollRef}>
        {messages.length === 0 && !querying && (
          <div className="message-bubble message-ai initial-msg">
            <div className="bubble-header">CodeBaseAI</div>
            <div className="bubble-content">
              {repoUrl ? 'Initializing technical analysis...' : 'Please link a repository on the Home page to start using CodeBaseAI.'}
            </div>
          </div>
        )}

        {messages.filter(m => !m.hidden).map((msg, idx, filtered) => (
          <div key={idx} className={`message-bubble ${msg.role === 'ai' ? 'message-ai' : 'message-user'}`}>
            <div className="bubble-header">
              {msg.role === 'ai' ? `CodeBaseAI : ${repoName}` : 'YOU'}
            </div>
            <div className="bubble-content">
              {msg.role === 'ai' && idx === filtered.length - 1 ? (
                <Typewriter text={msg.content} />
              ) : (
                <MarkdownText text={msg.content} />
              )}
            </div>
          </div>
        ))}

        {querying && (
          <div className="message-bubble message-ai thinking">
            <div className="bubble-header">CodeBaseAI</div>
            <div className="bubble-content animate">CodeBaseAI is thinking...</div>
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <input 
            type="text" 
            placeholder="Ask CodeBaseAI about the code..." 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          />
          <button 
            className="chat-send-btn" 
            onClick={() => handleQuery()}
            disabled={querying || !repoUrl}
          >
            {querying ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
