import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Building2, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check for account lockout on mount and when email changes
  useEffect(() => {
    if (email) {
      checkLockoutStatus();
    }
  }, [email]);

  // Update lockout timer
  useEffect(() => {
    if (isLockedOut && lockoutTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLockoutTimeRemaining((prev) => {
          if (prev <= 1000) {
            setIsLockedOut(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLockedOut, lockoutTimeRemaining]);

  const checkLockoutStatus = () => {
    const lockoutData = localStorage.getItem(`lockout_${email}`);
    if (lockoutData) {
      const { timestamp, attempts } = JSON.parse(lockoutData);
      const timeSinceLockout = Date.now() - timestamp;
      
      if (attempts >= MAX_FAILED_ATTEMPTS && timeSinceLockout < LOCKOUT_DURATION_MS) {
        setIsLockedOut(true);
        setLockoutTimeRemaining(LOCKOUT_DURATION_MS - timeSinceLockout);
      } else if (timeSinceLockout >= LOCKOUT_DURATION_MS) {
        // Clear lockout if duration has passed
        localStorage.removeItem(`lockout_${email}`);
        setIsLockedOut(false);
      }
    }
  };

  const recordFailedAttempt = (email: string) => {
    const lockoutData = localStorage.getItem(`lockout_${email}`);
    let attempts = 1;
    let timestamp = Date.now();

    if (lockoutData) {
      const data = JSON.parse(lockoutData);
      const timeSinceLastAttempt = Date.now() - data.timestamp;
      
      // Reset attempts if more than lockout duration has passed
      if (timeSinceLastAttempt >= LOCKOUT_DURATION_MS) {
        attempts = 1;
      } else {
        attempts = data.attempts + 1;
      }
    }

    localStorage.setItem(`lockout_${email}`, JSON.stringify({ attempts, timestamp }));

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      setIsLockedOut(true);
      setLockoutTimeRemaining(LOCKOUT_DURATION_MS);
    }

    return attempts;
  };

  const clearFailedAttempts = (email: string) => {
    localStorage.removeItem(`lockout_${email}`);
    setIsLockedOut(false);
    setLockoutTimeRemaining(0);
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    // Auto-redirect authenticated users who directly visit the login page
    if (!hasSubmitted && user && profile && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, navigate, from, hasSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if account is locked out
    if (isLockedOut) {
      toast({
        variant: 'destructive',
        title: 'Account Locked',
        description: `Too many failed attempts. Please try again in ${formatTimeRemaining(lockoutTimeRemaining)}.`,
      });
      return;
    }

    setHasSubmitted(true);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        const attempts = recordFailedAttempt(email);
        const remainingAttempts = MAX_FAILED_ATTEMPTS - attempts;

        if (remainingAttempts > 0) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account lockout.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Account Locked',
            description: 'Too many failed login attempts. Your account is locked for 30 minutes.',
          });
        }
        return;
      }

      // Credentials are valid, now verify profile and role before redirecting
      const { data: userResult, error: userError } = await supabase.auth.getUser();

      if (userError || !userResult?.user) {
        toast({
          variant: 'destructive',
          title: 'Login Error',
          description: 'Unable to retrieve your account details. Please try again.',
        });
        return;
      }

      const { data: profileResult, error: profileError } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('id', userResult.user.id)
        .single();

      if (profileError || !profileResult) {
        toast({
          variant: 'destructive',
          title: 'Account Not Ready',
          description: 'Your account is not fully configured. Please contact your administrator.',
        });
        return;
      }

      if (!profileResult.is_active) {
        toast({
          variant: 'destructive',
          title: 'Account Deactivated',
          description: 'Your account has been deactivated. Please contact your administrator.',
        });
        return;
      }

      // Clear failed attempts on successful login
      clearFailedAttempts(email);

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Land Management System</CardTitle>
          <CardDescription>
            Sign in to access the Jigjiga City Administration LMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription>
                Supabase is not configured. Please create a <code className="text-xs">.env</code> file and add:{' '}
                <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
                <code className="text-xs">VITE_SUPABASE_ANON_KEY</code>.
                <br />
                <span className="text-xs mt-2 block">See SETUP-GUIDE.md for detailed instructions.</span>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || isLockedOut}>
              {loading ? 'Signing in...' : isLockedOut ? `Locked (${formatTimeRemaining(lockoutTimeRemaining)})` : 'Sign In'}
            </Button>
            {isLockedOut && (
              <p className="text-sm text-center text-destructive mt-2">
                Account locked due to too many failed attempts. Try again in {formatTimeRemaining(lockoutTimeRemaining)}.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
