import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent if your email is registered.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">D</span>
          </div>
          <span className="text-2xl font-semibold text-foreground tracking-tight">DevOS</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground mb-1">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-foreground">Forgot password</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} className="pl-9" disabled={loading} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
