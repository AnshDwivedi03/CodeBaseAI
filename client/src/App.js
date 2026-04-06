import React, { useState, Suspense, lazy } from 'react';
import './App.css';
import Navbar from './components/Navbar';

const HomeView = lazy(() => import('./components/HomeView'));
const AnalysisView = lazy(() => import('./components/AnalysisView'));
const DiagramView = lazy(() => import('./components/DiagramView'));

const LoadingFallback = () => (
  <div className="loading-fallback">
    <div className="premium-spinner"></div>
    <p>Loading CodeBaseAI...</p>
  </div>
);

const ErrorAlert = ({ message, onClose }) => (
  <div className="custom-alert-overlay">
    <div className="custom-alert-box animate-pop glass-panel">
      <div className="alert-icon">⚠️</div>
      <div className="alert-title">Attention</div>
      <div className="alert-message">{message}</div>
      <button className="alert-close-btn pulse-glow" onClick={onClose}>Got it</button>
    </div>
  </div>
);

function App() {
  const [view, setView] = useState('home');
  const [repoUrl, setRepoUrl] = useState('');
  const [indexing, setIndexing] = useState(false);
  const [indexed, setIndexed] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState(null);
  const [diagram, setDiagram] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState(null);
  const [filePaths, setFilePaths] = useState([]);

  React.useEffect(() => {
    const titles = {
      home: 'CodeBaseAI | Index Repository',
      query: 'CodeBaseAI | Codebase Analysis',
      diagram: 'CodeBaseAI | Architecture Diagram',
    };
    document.title = titles[view] || 'CodeBaseAI';
  }, [view]);

  const handleViewChange = (newView) => {
    if (newView === 'home' && (view === 'query' || view === 'diagram' || indexed)) {
      setRepoUrl('');
      setIndexed(false);
      setQuestion('');
      setMessages([]);
      setDiagram(null);
      setDiagramError(null);
      setFilePaths([]);
    }
    setView(newView);
  };

  const handleIndex = async () => {
    if (!repoUrl) return;
    setIndexing(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      if (response.ok) {
        setIndexed(true);
        setTimeout(() => setView('query'), 1000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to index repository.');
      }
    } catch (err) {
      setError('Failed to connect to backend.');
    } finally {
      setIndexing(false);
    }
  };

  const handleQuery = async (pilledQuestion, isHidden = false) => {
    const q = pilledQuestion || question;
    if (!repoUrl || !q) return;

    const userMessage = { role: 'user', content: q, hidden: isHidden };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setQuerying(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, question: q }),
      });
      const data = await response.json();
      if (response.ok) {
        const aiMessage = { role: 'ai', content: data.answer };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(data.error || 'The AI failed to generate a response.');
      }
    } catch (err) {
      setError('Failed to query backend. Please check your connection.');
    } finally {
      setQuerying(false);
    }
  };

  const handleDiagram = async () => {
    if (!repoUrl) return;
    setDiagramLoading(true);
    setDiagramError(null);
    setDiagram(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/diagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await response.json();
      if (response.ok) {
        setDiagram(data.diagram);
        setRoutes(data.routes || []);
        setFilePaths(data.filePaths || []);
      } else {
        setDiagramError(data.error || 'Failed to generate diagram.');
      }
    } catch (err) {
      setDiagramError('Failed to connect to backend.');
    } finally {
      setDiagramLoading(false);
    }
  };

  return (
    <div className="App animated-bg">
      <div className="bg-glow blob-1"></div>
      <div className="bg-glow blob-2"></div>
      <div className="bg-glow blob-3"></div>
      
      <Navbar activeView={view} onNavigate={handleViewChange} />

      <main className={`main-container ${view === 'home' ? 'view-home' : 'view-analysis'}`}>
        <Suspense fallback={<LoadingFallback />}>
          {view === 'home' && (
            <HomeView
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              handleIndex={handleIndex}
              indexing={indexing}
              indexed={indexed}
            />
          )}
          {view === 'query' && (
            <AnalysisView
              repoUrl={repoUrl}
              question={question}
              setQuestion={setQuestion}
              handleQuery={handleQuery}
              querying={querying}
              messages={messages}
            />
          )}
          {view === 'diagram' && (
            <DiagramView
              repoUrl={repoUrl}
              diagram={diagram}
              routes={routes}
              diagramLoading={diagramLoading}
              diagramError={diagramError}
              handleDiagram={handleDiagram}
              filePaths={filePaths}
            />
          )}
        </Suspense>
      </main>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
    </div>
  );
}

export default App;
