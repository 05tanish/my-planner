import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRouter } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'hsl(231 20% 12%)',
              border: '1px solid hsl(225 12% 19%)',
              color: 'hsl(0 0% 96%)',
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
