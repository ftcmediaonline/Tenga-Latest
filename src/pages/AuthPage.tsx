import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import tengaLogo from '@/assets/tenga-logo.png';
import tengaLogoWhite from '@/assets/tenga-logo-white.png';

/** Must match Supabase → Authentication → URL Configuration → Redirect URLs */
function getAuthRedirectUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const base =
    configured && isLocal
      ? configured
      : window.location.origin.replace(/\/$/, '');
  return `${base}/auth`;
}

function hasEmailCallbackInUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  return (
    params.has('code') ||
    hash.includes('access_token') ||
    params.get('type') === 'signup' ||
    params.get('type') === 'email'
  );
}

function hasRecoveryCallbackInUrl(): boolean {
  const hash = window.location.hash;
  const params = new URLSearchParams(window.location.search);
  return (
    hash.includes('type=recovery') ||
    params.get('type') === 'recovery' ||
    hash.includes('recovery_token=') ||
    params.has('recovery_token')
  );
}

function signupErrorMessage(error: { message?: string; status?: number }): string {
  const msg = (error.message ?? '').toLowerCase();
  if (error.status === 422 && (msg.includes('redirect') || msg.includes('url'))) {
    return `Redirect URL not allowed. Add this exact URL in Supabase → Authentication → URL Configuration: ${getAuthRedirectUrl()}`;
  }
  return error.message ?? 'Signup failed';
}

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'update-password';

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [forgotForm, setForgotForm] = useState({ email: '' });
  const [updateForm, setUpdateForm] = useState({ password: '', confirmPassword: '' });
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const handlingEmailCallback = useRef(hasEmailCallbackInUrl());

  useEffect(() => {
    if (hasRecoveryCallbackInUrl()) {
      setMode('update-password');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error_description') ?? params.get('error');
    if (authError) {
      toast({
        title: 'Authentication link invalid',
        description: decodeURIComponent(authError.replace(/\+/g, ' ')),
        variant: 'destructive',
      });
      window.history.replaceState({}, document.title, '/auth');
      handlingEmailCallback.current = false;
      return;
    }

    if (!handlingEmailCallback.current && !hasRecoveryCallbackInUrl()) return;

    const completeVerification = () => {
      if (!handlingEmailCallback.current) return;
      handlingEmailCallback.current = false;
      toast({ title: 'Email verified!', description: 'Welcome to Tenga. You are signed in.' });
      window.history.replaceState({}, document.title, '/auth');
      navigate('/');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update-password');
      } else if (
        handlingEmailCallback.current &&
        session &&
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')
      ) {
        completeVerification();
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (handlingEmailCallback.current && session) {
        completeVerification();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });
    
    if (error) {
      setLoading(false);
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
      return;
    }

    const user = data.user;
    if (user && !user.email_confirmed_at) {
      // Clear session immediately so they are strictly logged out
      await supabase.auth.signOut();
      setLoading(false);
      setPendingVerificationEmail(loginForm.email);
      toast({
        title: 'Email confirmation required',
        description: 'Your email has not been verified. Please click the verification link in your inbox before signing in.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(false);
    toast({ title: 'Welcome back!' });
    navigate('/');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.fullName || !signupForm.email || !signupForm.password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (signupForm.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const email = signupForm.email.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signupForm.password,
      options: {
        data: { full_name: signupForm.fullName },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Signup failed', description: signupErrorMessage(error), variant: 'destructive' });
      return;
    }

    if (data.session) {
      toast({ title: 'Welcome to Tenga!', description: 'Your account is ready.' });
      navigate('/');
      return;
    }

    if (data.user?.identities?.length === 0) {
      setPendingVerificationEmail(email);
      toast({
        title: 'Email already registered',
        description: 'Sign in, or use “Resend verification email” if you have not confirmed yet.',
        variant: 'destructive',
      });
      return;
    }

    setPendingVerificationEmail(email);
    toast({
      title: 'Account created',
      description: 'Check your inbox (and spam) for a verification link from Tenga.',
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotForm.email) {
      toast({ title: 'Please enter your email address', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotForm.email.trim(), {
      redirectTo: getAuthRedirectUrl(),
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Reset request failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Recovery email sent',
        description: 'Check your inbox (and spam) for the password reset link.',
      });
      setMode('login');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateForm.password || !updateForm.confirmPassword) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    if (updateForm.password !== updateForm.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (updateForm.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: updateForm.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Password updated!',
        description: 'Your password was successfully reset. You are now signed in.',
      });
      window.history.replaceState({}, document.title, '/auth');
      navigate('/');
    }
  };

  const handleResendVerification = async () => {
    const email = pendingVerificationEmail?.trim() || signupForm.email.trim();
    if (!email) {
      toast({ title: 'Enter your email first', variant: 'destructive' });
      return;
    }
    setResendingVerification(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    setResendingVerification(false);
    if (error) {
      toast({ title: 'Could not resend email', description: signupErrorMessage(error), variant: 'destructive' });
    } else {
      setPendingVerificationEmail(email);
      toast({
        title: 'Verification email sent',
        description: `If ${email} is registered, you will receive a new link shortly.`,
      });
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  const getHeaderTitle = () => {
    switch (mode) {
      case 'signup':
        return 'Create your account';
      case 'forgot-password':
        return 'Reset password';
      case 'update-password':
        return 'Create new password';
      default:
        return 'Welcome back';
    }
  };

  const getHeaderDesc = () => {
    switch (mode) {
      case 'signup':
        return 'Join the Tenga marketplace';
      case 'forgot-password':
        return "Enter your email to receive a recovery link";
      case 'update-password':
        return 'Enter a secure new password for your account';
      default:
        return 'Sign in to your Tenga account';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img src={theme === 'dark' ? tengaLogoWhite : tengaLogo} alt="Tenga" className="h-12 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">
              {getHeaderTitle()}
            </h1>
            <p className="text-muted-foreground mt-1">
              {getHeaderDesc()}
            </p>
          </div>

          <Card className="border-border">
            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                {mode === 'login' && (
                  <motion.form
                    key="login"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => setMode('forgot-password')}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </motion.form>
                )}

                {mode === 'signup' && (
                  <motion.form
                    key="signup"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleSignup}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          placeholder="John Doe"
                          className="pl-10"
                          value={signupForm.fullName}
                          onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                    {(pendingVerificationEmail || signupForm.email) && (
                      <p className="text-center text-sm text-muted-foreground">
                        Didn&apos;t get the email?{' '}
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendingVerification}
                          className="text-primary hover:underline disabled:opacity-50 font-medium"
                        >
                          {resendingVerification ? 'Sending…' : 'Resend verification email'}
                        </button>
                      </p>
                    )}
                  </motion.form>
                )}

                {mode === 'forgot-password' && (
                  <motion.form
                    key="forgot"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleForgotPassword}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={forgotForm.email}
                          onChange={(e) => setForgotForm({ email: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                      {loading ? 'Sending link...' : 'Send Reset Link'}
                    </Button>
                  </motion.form>
                )}

                {mode === 'update-password' && (
                  <motion.form
                    key="update"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleUpdatePassword}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="update-password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="update-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={updateForm.password}
                          onChange={(e) => setUpdateForm({ ...updateForm, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="update-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="update-confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10"
                          value={updateForm.confirmPassword}
                          onChange={(e) => setUpdateForm({ ...updateForm, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                      {loading ? 'Updating password...' : 'Update Password'}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="mt-6 text-center">
                {mode === 'login' ? (
                  <button
                    onClick={() => setMode('signup')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    Don't have an account? Sign up
                  </button>
                ) : mode === 'signup' ? (
                  <button
                    onClick={() => setMode('login')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    Already have an account? Sign in
                  </button>
                ) : (
                  <button
                    onClick={() => setMode('login')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
