import '../styles/globals.css';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Add error boundary for client-side errors
    const handleError = (error) => {
      console.error('Client-side error:', error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 