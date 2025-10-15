import { createRoot } from 'react-dom/client'
import './index.css'

// Dynamic import with error handling
const initializeApp = async () => {
  try {
    const { default: App } = await import('./App.tsx');
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);
  } catch (error) {
    console.error('Failed to load main App:', error);
    
    // Simple fallback without external dependencies
    const root = createRoot(document.getElementById("root")!);
    root.render(
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Application Error</h1>
          <p style={{ marginBottom: '1rem' }}>Failed to load the application.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

// Initialize the app
initializeApp().catch(error => {
  console.error('Critical error during app initialization:', error);
  
  // Last resort fallback
  document.getElementById("root")!.innerHTML = `
    <div style="min-height: 100vh; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-family: system-ui;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Critical Error</h1>
        <p style="margin-bottom: 1rem;">Failed to initialize the application.</p>
        <button onclick="window.location.reload()" style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `;
});
