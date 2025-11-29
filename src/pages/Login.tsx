import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Building2, AlertTriangle, Mail, Lock, MapPin, Shield, Database } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import loginHeroBg from '@/assets/login-hero-bg.jpg';

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
    if (!hasSubmitted && user && profile && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, navigate, from, hasSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    <div className="flex min-h-screen">
      {/* Left Hero Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${loginHeroBg})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-12 text-white">
          <div className="space-y-8 text-center max-w-xl">
            {/* Brand */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Jigjiga City</h2>
                <p className="text-sm text-white/80">Administration</p>
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                Land Management
                <br />
                <span className="text-white/90">System</span>
              </h1>
              <p className="text-base text-white/90">
                Comprehensive digital platform for property registration, 
                ownership records, and municipal tax administration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Land Management System</h2>
              <p className="text-sm text-muted-foreground">Jigjiga City Administration</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-muted-foreground">
              Sign in to access your administrative dashboard
            </p>
          </div>

          {/* Configuration Alert */}
          {!isSupabaseConfigured && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription className="text-xs">
                Supabase is not configured. Please add <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> to your .env file.
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium" 
              disabled={loading || isLockedOut}
            >
              {loading ? 'Signing in...' : isLockedOut ? `Locked (${formatTimeRemaining(lockoutTimeRemaining)})` : 'Sign In'}
            </Button>

            {/* Lockout Warning */}
            {isLockedOut && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Account locked due to multiple failed attempts. Try again in {formatTimeRemaining(lockoutTimeRemaining)}.
                </AlertDescription>
              </Alert>
            )}
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Contact your system administrator for access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
