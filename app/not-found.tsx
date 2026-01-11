import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 Not Found | Adelaide Super League',
  description: 'The page you are looking for could not be found',
};

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{ 
        fontSize: '8rem', 
        fontWeight: 800, 
        color: '#e5e5e5', 
        margin: 0,
        lineHeight: 1,
        letterSpacing: '-0.05em',
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        color: '#333',
        margin: '0.5rem 0 1rem 0',
      }}>
        Page Not Found
      </h2>
      <p style={{ 
        fontSize: '1rem', 
        color: '#666', 
        margin: '0 0 2rem 0',
        maxWidth: '400px',
      }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link 
        href="/"
        style={{
          padding: '0.75rem 2rem',
          background: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 500,
          fontSize: '1rem',
          transition: 'background 0.15s ease',
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}

