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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    // Auto-redirect authenticated users who directly visit the login page
    if (!hasSubmitted && user && profile && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, navigate, from, hasSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message || 'Invalid email or password',
        });
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
