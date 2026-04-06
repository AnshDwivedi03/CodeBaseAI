import React, { useState, useEffect } from 'react';
import Footer from './Footer';

const loadingSteps = [
  "Cloning Repository...",
  "Parsing File Tree...",
  "Generating Semantic Embeddings...",
  "Upserting to Vector DB...",
  "Finalizing Analysis..."
];

const HomeView = ({ repoUrl, setRepoUrl, handleIndex, indexing, indexed }) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (indexing) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500); // Progress to next step every 2.5s
    } else {
      setStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [indexing]);

  return (
    <div className="content-wrapper animate" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%' }}>
      <div className="home-grid" style={{ flex: 1, paddingBottom: '3rem' }}>
        <div className="home-main-col">
          <h1 style={{ textTransform: 'uppercase', letterSpacing: '-2px' }}>Master Your Codebase.<br/><span className="gradient-text">The CodeBaseAI Way.</span></h1>
          <p style={{ maxWidth: '580px', fontSize: '1.3rem', margin: '0 auto', textAlign: 'center' }}>
            Stop digging through thousands of lines of code. Let the AI index your repository
            and answer your most complex technical questions instantly.
          </p>

          <div className="card glass-panel" style={{ marginTop: '2rem', maxWidth: '500px', padding: '1.5rem', border: '1px solid var(--primary)', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3 style={{ marginBottom: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>🦇 Secure Link</h3>
            <div className="input-group" style={{ marginTop: '0', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Paste Repo URL..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                style={{ padding: '1rem', fontSize: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.6)' }}
                disabled={indexing}
              />
              {!indexing && (
                <button className="btn-primary" onClick={handleIndex} disabled={!repoUrl || indexing} style={{ padding: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Initialize Analysis
                </button>
              )}
            </div>
            
            {indexing && (
              <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.4s ease-in-out' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {loadingSteps.map((step, i) => {
                    const isCompleted = i < stepIndex;
                    const isActive = i === stepIndex;
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(234,179,8,0.08)' : 'transparent',
                        border: isActive ? '1px solid rgba(234,179,8,0.3)' : '1px solid transparent',
                        transition: 'all 0.4s ease',
                      }}>
                        {/* Icon */}
                        <div style={{ width: '22px', height: '22px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isCompleted && (
                            <span style={{ color: '#22c55e', fontSize: '1rem' }}>✓</span>
                          )}
                          {isActive && (
                            <div style={{
                              width: '16px', height: '16px', borderRadius: '50%',
                              border: '2px solid var(--primary)',
                              borderTopColor: 'transparent',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                          )}
                          {!isCompleted && !isActive && (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#444' }} />
                          )}
                        </div>
                        {/* Label */}
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: isActive ? '600' : '400',
                          color: isCompleted ? '#22c55e' : isActive ? 'var(--primary)' : '#555',
                          transition: 'color 0.3s ease',
                        }}>{step}</span>
                      </div>
                    );
                  })}
                </div>
                <p style={{ color: '#555', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
                  This may take a minute for large repositories.
                </p>
              </div>
            )}
            
            {indexed && !indexing && <div className="success-tag animate" style={{ justifyContent: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>✓ Link Established</div>}
          </div>
        </div>


        <div className="card home-side-col">
          <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem' }}>How It Works</h2>

          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#fff' }}>1. Sync Your Repository</h3>
            <p style={{ fontSize: '1rem' }}>Instantly ingest your entire codebase. Every file, folder, and dependency is mapped into a clean, structured system.</p>
          </div>
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#fff' }}>2. Vectorize and Understand</h3>
            <p style={{ fontSize: '1rem' }}>Your code is transformed into high dimensional semantic vectors that capture logic, relationships, and context with depth.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#fff' }}>3. Ask CodeBaseAI</h3>
            <p style={{ fontSize: '1rem' }}>Interact with your codebase using CodeBaseAI and get precise, context aware answers in seconds.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HomeView;
