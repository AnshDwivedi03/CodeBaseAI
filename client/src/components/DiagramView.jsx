import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import FileTree from './FileTree';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#0a0a0a',
    primaryColor: '#1e1e2e',
    primaryTextColor: '#f4f4f5',
    primaryBorderColor: '#f5b041',
    lineColor: '#f5b041',
    secondaryColor: '#161622',
    tertiaryColor: '#0c0c0c',
    edgeLabelBackground: '#0c0c0c',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    clusterBkg: 'rgba(245, 176, 65, 0.05)',
    clusterBorder: 'rgba(245, 176, 65, 0.25)',
  },
  flowchart: {
    curve: 'basis',
    padding: 25,
    nodeSpacing: 50,
    rankSpacing: 60,
    htmlLabels: true,
    defaultRenderer: 'dagre-wrapper',
    useMaxWidth: false,
    diagramPadding: 30,
    wrappingWidth: 200,
  },
});

const DiagramView = ({ repoUrl, diagram, routes, diagramLoading, handleDiagram, diagramError, filePaths }) => {
  const mermaidRef = useRef(null);
  const containerRef = useRef(null);
  
  // Pan and Zoom State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const getRepoName = (url) => {
    if (!url) return '';
    const parts = url.replace(/\/$/, '').split('/');
    return parts.length >= 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : url;
  };

  useEffect(() => {
    if (diagram && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      
      // Reset pan/zoom on new diagram
      setScale(1);
      setPosition({ x: 0, y: 0 });

      const tryRender = async (diagramCode, attempt = 1) => {
        const id = `mermaid-${Date.now()}-${attempt}`;
        try {
          const { svg } = await mermaid.render(id, diagramCode);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
            const svgEl = mermaidRef.current.querySelector('svg');
            if (svgEl) {
              const viewBox = svgEl.getAttribute('viewBox');
              if (viewBox) {
                const [, , w, h] = viewBox.split(' ');
                svgEl.style.width = `${w}px`;
                svgEl.style.height = `${h}px`;
              } else {
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
              }
              svgEl.style.maxWidth = 'none';
            }
          }
        } catch (err) {
          console.error(`Mermaid render error (attempt ${attempt}):`, err);
          
          if (attempt === 1) {
            // Retry: strip subgraphs which often cause issues
            const simplified = diagramCode
              .replace(/subgraph[\s\S]*?end/gi, '')
              .replace(/style\s+\w+.*/gi, '')
              .replace(/classDef\s+.*/gi, '')
              .replace(/class\s+.*/gi, '')
              .split('\n')
              .filter(l => l.trim())
              .join('\n');
            console.log('[Mermaid] Retrying without subgraphs...');
            return tryRender(simplified, 2);
          }
          
          if (attempt === 2) {
            // Last resort: extract just nodes and arrows
            const lines = diagramCode.split('\n');
            const safeLines = lines.filter(l => {
              const t = l.trim();
              return t.startsWith('flowchart') || t.startsWith('graph') || t.includes('-->');
            });
            if (safeLines.length > 1) {
              console.log('[Mermaid] Retrying with arrows only...');
              return tryRender(safeLines.join('\n'), 3);
            }
          }
          
          // Final fallback: show raw code
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `
              <div style="padding:2rem;text-align:center;">
                <div style="color:#f5b041;font-weight:600;margin-bottom:1rem;">⚠ Diagram rendered as text (Mermaid syntax error)</div>
                <pre style="color:#a0a0a0;font-size:0.8rem;overflow:auto;padding:1rem;background:rgba(0,0,0,0.3);border-radius:12px;text-align:left;max-height:400px">${diagramCode}</pre>
              </div>`;
          }
        }
      };

      tryRender(diagram);
    }
  }, [diagram]);

  // --- Pan & Zoom Handlers ---

  const handleWheel = (e) => {
    if (!diagram) return;
    // zoom factor
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    let newScale = scale + delta;
    
    // Bounds
    newScale = Math.min(Math.max(0.2, newScale), 4);
    setScale(newScale);
  };

  const handlePointerDown = (e) => {
    if (!diagram) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !diagram) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="diagram-container animate">
      {/* Header */}
      <div className="diagram-header">
        <div>
          <div className="diagram-title">
            <span className="diagram-icon">⬡</span>
            Structured 2D Architecture
          </div>
          {repoUrl && (
            <div className="diagram-subtitle">{getRepoName(repoUrl)}</div>
          )}
        </div>
        <button
          className="diagram-generate-btn"
          onClick={handleDiagram}
          disabled={diagramLoading || !repoUrl}
        >
          {diagramLoading ? (
            <span className="btn-loading">
              <span className="spinner" /> Generating...
            </span>
          ) : diagram ? (
            '↺ Regenerate Flow'
          ) : (
            '⬡ Generate 2D Map'
          )}
        </button>
      </div>

      {/* Body */}
      <div className="diagram-body">
        {!repoUrl && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
             <div style={{ fontSize: '4rem' }}>⬡</div>
          </div>
        )}

        {repoUrl && !diagram && !diagramLoading && !diagramError && (
          <div className="diagram-empty">
            <div className="empty-icon">◈</div>
            <div className="empty-title">Ready to build diagram</div>
            <div className="empty-desc">Click <strong>"⬡ Generate 2D Map"</strong> to map out architecture components using AI.</div>
          </div>
        )}

        {diagramLoading && (
          <div className="diagram-empty">
            <div className="diagram-pulse">
              <div className="pulse-ring" /><div className="pulse-ring" /><div className="pulse-ring" />
            </div>
            <div className="empty-title" style={{ marginTop: '1.5rem' }}>Mapping Deep Architecture...</div>
            <div className="empty-desc">CodeBaseAI is writing the structured flowchart. This takes ~15 seconds.</div>
          </div>
        )}

        {diagramError && !diagramLoading && (
          <div className="diagram-empty">
            <div className="empty-icon">⚠</div>
            <div className="empty-title">Generation failed</div>
            <div className="empty-desc">{diagramError}</div>
          </div>
        )}

        {diagram && !diagramLoading && (
        <>
          <div className="diagram-result diagram-result-box">
            <div className="diagram-toolbar">
              <button className="zoom-btn" onClick={() => setScale(s => Math.min(s + 0.2, 4))}>＋ Zoom In</button>
              <span className="zoom-label">{Math.round(scale * 100)}%</span>
              <button className="zoom-btn" onClick={() => setScale(s => Math.max(s - 0.2, 0.2))}>－ Zoom Out</button>
              <button className="zoom-btn" onClick={() => { setScale(1); setPosition({x:0, y:0}); }}>⊡ Center & Reset</button>
              <span style={{color: '#71717a', fontSize: '0.8rem', marginLeft: 'auto'}}>Scroll to zoom, drag to pan</span>
            </div>
            
            {/* Interactive Canvas Area */}
            <div 
              className="diagram-interactive-area"
              ref={containerRef}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={e => e.preventDefault()}
              style={{
                flex: 1,
                overflow: 'hidden',
                backgroundColor: '#050505',
                cursor: isDragging ? 'grabbing' : 'grab',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                ref={mermaidRef}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  flexShrink: 0
                }}
              />
            </div>
          </div>

          {/* Details Section */}
          {routes && routes.length > 0 && (
            <div className="routes-details-section" style={{ marginTop: '2rem', padding: '0 1rem 2rem 1rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📋</span> Architecture Components
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {routes.map((route, idx) => {
                  let badgeColor = '#71717a'; // Default grey
                  const t = route.type?.toLowerCase() || '';
                  if (t.includes('api') || t.includes('route')) badgeColor = '#ef4444'; // Red
                  else if (t.includes('function') || t.includes('method')) badgeColor = '#3b82f6'; // Blue
                  else if (t.includes('db') || t.includes('database')) badgeColor = '#22c55e'; // Green
                  else if (t.includes('component')) badgeColor = '#a855f7'; // Purple
                  else if (t.includes('file')) badgeColor = '#eab308'; // Yellow

                  return (
                    <div key={idx} style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.08)', 
                      padding: '1.25rem', 
                      borderRadius: '12px',
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'}}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'}}
                    >
                      <div style={{ display: 'inline-block', padding: '0.1rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.8rem', backgroundColor: `${badgeColor}20`, color: badgeColor }}>
                        {route.type || 'NODE'}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.6rem', wordBreak: 'break-all' }}>
                        {route.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                        {route.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File Tree Section */}
          {filePaths && filePaths.length > 0 && (
            <FileTree filePaths={filePaths} repoUrl={repoUrl} />
          )}
        </>
        )}
      </div>
    </div>
  );
};

export default DiagramView;
