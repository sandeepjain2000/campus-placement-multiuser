'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { registerClientErrorReporter } from '@/lib/clientErrorReport';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [logHistory, setLogHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const downloadLog = (message, meta) => {
    const content = `ERROR REPORT\nTime: ${new Date().toISOString()}\nMessage: ${message}\n\nDATA:\n${JSON.stringify(meta, null, 2)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addToast = useCallback((message, type = 'info', duration = 5000, meta = null) => {
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, meta, timestamp: new Date() };
    setToasts(prev => [...prev, newToast]);
    
    // Add to session history if it has diagnostic data
    if (meta || type === 'error' || type === 'warning') {
      setLogHistory(prev => [newToast, ...prev].slice(0, 50)); // Keep last 50
    }

    const finalDuration = type === 'error' && meta ? 15000 : duration;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, finalDuration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const info = useCallback((message) => addToast(message, 'info'), [addToast]);
  const warn = useCallback((message) => addToast(message, 'warning'), [addToast]);

  useEffect(() => {
    registerClientErrorReporter(addToast);
    return () => registerClientErrorReporter(null);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, info, warn }}>
      {children}
      
      {/* Floating Action Button for Logs */}
      {logHistory.length > 0 && (
        <button 
          onClick={() => setShowHistory(!showHistory)}
          style={{ 
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 10000,
            width: '3rem', height: '3rem', borderRadius: '12px', 
            background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)',
            color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
            transition: 'all 0.2s ease'
          }}
          className="hover-scale"
          title="Session Log History"
        >
          📋
          <span style={{ 
            position: 'absolute', top: '-6px', right: '-6px', background: 'var(--primary-500)',
            color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px',
            border: '2px solid var(--bg-primary)'
          }}>
            {logHistory.length}
          </span>
        </button>
      )}

      {/* Log History Panel */}
      {showHistory && (
        <div style={{ 
          position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 10000,
          width: '380px', maxHeight: '550px', background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '16px', boxShadow: 'var(--shadow-xl)', display: 'flex', 
          flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>Session Diagnostics</h4>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'rgba(255,255,255,0.5)' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {logHistory.map(log => (
              <div key={log.id} style={{ 
                padding: '1rem', borderRadius: '12px', marginBottom: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(255, 255, 255, 0.03)', fontSize: '0.8125rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                    color: log.type === 'error' ? '#fb7185' : log.type === 'warning' ? '#fbbf24' : '#818cf8'
                  }}>
                    {log.type}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{log.timestamp.toLocaleTimeString()}</span>
                </div>
                <div style={{ fontWeight: 500, color: 'white', lineHeight: 1.4, marginBottom: '0.75rem' }}>{log.message}</div>
                {log.meta && (
                  <button 
                    onClick={() => downloadLog(log.message, log.meta)}
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', 
                      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                      fontWeight: 600, width: '100%'
                    }}
                  >
                    📥 Download JSON Report
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
            <button 
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}
              onClick={() => setLogHistory([])}
            >
              Clear Session Logs
            </button>
          </div>
        </div>
      )}

      <div className="toast-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '1rem', pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' || toast.type === 'warning' ? 'assertive' : 'polite'}
            style={{ 
              background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(16px)',
              color: 'white', padding: '1rem 1.25rem', borderRadius: '14px', 
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: `5px solid ${toast.type === 'error' ? '#f43f5e' : toast.type === 'warning' ? '#f59e0b' : '#6366f1'}`,
              display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '320px', maxWidth: '480px',
              pointerEvents: 'auto', animation: 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{toast.message}</div>
              {(toast.type === 'error' || toast.type === 'warning') && toast.meta && (
                <button 
                  onClick={() => downloadLog(toast.message, toast.meta)}
                  style={{ 
                    background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', 
                    fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', 
                    marginTop: '0.75rem', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Download Audit Report
                </button>
              )}
            </div>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', padding: '0.25rem' }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
