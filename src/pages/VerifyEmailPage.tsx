import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import tengaLogo from '@/assets/tenga-logo.png';
import tengaLogoWhite from '@/assets/tenga-logo-white.png';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Redirect if already logged in and verified
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        navigate('/', { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email_confirmed_at) {
        toast({ title: 'Email verified!', description: 'Welcome to Tenga.' });
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!email) {
      toast({ title: 'Email address missing', description: 'Could not resend verification email.', variant: 'destructive' });
      return;
    }
    setResending(true);
    
    // Get base URL for redirect
    const configured = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = configured && isLocal ? configured : window.location.origin.replace(/\/$/, '');
    const redirectUrl = `${base}/#/auth`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    
    setResending(false);
    if (error) {
      toast({ title: 'Resend failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email sent', description: 'A new verification link has been sent to your inbox.' });
      setCountdown(60); // 60s throttle
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img src={theme === 'dark' ? tengaLogoWhite : tengaLogo} alt="Tenga" className="h-12 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
            <p className="text-muted-foreground mt-1">We sent a verification link to your inbox</p>
          </div>

          <Card className="border-border shadow-lg backdrop-blur-sm bg-card/85">
            <CardContent className="pt-8 pb-6 text-center space-y-6">
              <div className="relative flex justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                  <Mail className="h-10 w-10" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Please click the link in the email sent to:
                </p>
                <p className="font-semibold text-foreground break-all">{email || 'your email address'}</p>
              </div>

              <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg border border-border/40">
                Can&apos;t find the email? Check your spam folder or click below to request a new link.
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleResend}
                  disabled={resending || countdown > 0}
                  className="w-full bg-gradient-primary gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
                </Button>

                <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground" asChild>
                  <Link to="/auth">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyEmailPage;
