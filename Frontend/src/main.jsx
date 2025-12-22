import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        toastOptions={{
          position: 'top-right',
          success: {
            style: {
              background: 'green',
              color: 'white',
              zIndex: 10000,
              borderWidth: '1px',
              borderColor: "white"
            },
          },
          error: {
            style: {
              background: 'red',
              color: 'white',
              zIndex: 10000,
              borderWidth: '1px',
              borderColor: "white"
            },
          },
        }}
      />
    </ErrorBoundary>
  </StrictMode>,
)
