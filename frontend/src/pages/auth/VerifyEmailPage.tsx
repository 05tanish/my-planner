import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => { setStatus('success'); setMessage('Email verified! You can now log in.'); })
      .catch(err => { setStatus('error'); setMessage(err?.response?.data?.message || 'Verification failed or link expired.'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">D</span>
          </div>
          <span className="text-2xl font-semibold text-foreground">DevOS</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center">
          {status === 'loading' && (
            <><Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your email...</p></>
          )}
          {status === 'success' && (
            <><CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-semibold text-foreground mb-2">Email Verified!</h2>
            <p className="text-sm text-muted-foreground mb-5">{message}</p>
            <Link to="/login" className="text-sm text-primary hover:underline">Go to login →</Link></>
          )}
          {status === 'error' && (
            <><XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="font-semibold text-foreground mb-2">Verification Failed</h2>
            <p className="text-sm text-muted-foreground mb-5">{message}</p>
            <Link to="/login" className="text-sm text-primary hover:underline">← Back to login</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
