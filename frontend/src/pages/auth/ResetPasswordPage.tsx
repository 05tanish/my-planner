import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error('Invalid reset link. Please request a new one.');
    if (password.length < 8) return toast.error('Password must be at least 8 characters.');
    if (password !== confirm) return toast.error('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reset failed. Try again.');
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
          <span className="text-2xl font-semibold text-foreground">DevOS</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Set new password</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={show ? 'text' : 'password'} placeholder="Min. 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)} className="pl-9 pr-9" disabled={loading} />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="confirm" type={show ? 'text' : 'password'} placeholder="Repeat password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-9" disabled={loading} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : 'Reset password'}
            </Button>
          </form>
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
