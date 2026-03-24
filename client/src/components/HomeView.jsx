import React from 'react';
import Footer from './Footer';

const HomeView = ({ repoUrl, setRepoUrl, handleIndex, indexing, indexed }) => {
  return (
    <div className="content-wrapper animate" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%' }}>
      <div className="home-grid" style={{ flex: 1, paddingBottom: '3rem' }}>
        <div className="home-main-col">
          <h1 style={{ textTransform: 'uppercase', letterSpacing: '-2px' }}>Master Your Codebase.<br/><span className="gradient-text">The CodeBaseAI Way.</span></h1>
          <p style={{ maxWidth: '580px', fontSize: '1.3rem' }}>
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
              />
              <button className="btn-primary" onClick={handleIndex} disabled={indexing} style={{ padding: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {indexing ? 'Syncing...' : 'Initialize Analysis'}
              </button>
            </div>
            {indexed && <div className="success-tag animate" style={{ justifyContent: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>✓ Link Established</div>}
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
