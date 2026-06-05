import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Loader2, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/utils/emailService';

const PromoBanner = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    if (!isAuthenticated) {
      // If not authenticated, we simulate the email in sandbox to prevent API failures
      // and gently guide the developer/user to login for real SMTP delivery
      setTimeout(async () => {
        const sentEmails = JSON.parse(localStorage.getItem('tenga_sent_emails') || '[]');
        const newEmail = {
          id: `email_${Date.now()}`,
          timestamp: new Date().toISOString(),
          error: "Simulated newsletter welcome for unauthenticated session",
          action: 'welcome-newsletter',
          email,
          customerName: 'Tenga Guest',
        };
        sentEmails.unshift(newEmail);
        localStorage.setItem('tenga_sent_emails', JSON.stringify(sentEmails.slice(0, 50)));

        toast({
          title: '📧 Welcome offer simulated (Sandbox)',
          description: `You are signed out. We simulated sending the welcome offer to ${email}. Sign in to test real delivery!`,
        });

        setLoading(false);
        setSuccess(true);
      }, 1000);
      return;
    }

    try {
      const res = await sendTransactionalEmail({
        action: 'welcome-newsletter',
        email: email.trim(),
        customerName: 'Valued Shopper',
      });

      if (res.success) {
        toast({
          title: '🎉 Welcome Offer Sent!',
          description: `Check your inbox or developer sandbox! We've sent a 20% discount coupon to ${email}.`,
        });
        setSuccess(true);
      } else {
        toast({
          title: 'Delivery Fallback',
          description: `We logged the discount email to your developer sandbox dashboard.`,
        });
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error Subscribing',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-light p-8 md:p-12 shadow-xl border border-navy-light/10"
        >
          {/* Background Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-1.5 mb-4">
                <Zap className="h-4 w-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">
                  Limited Time Offer
                </span>
              </div>
              <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl md:text-4xl tracking-tight">
                Get 20% off your first order
              </h2>
              <p className="mt-2 text-primary-foreground/80 text-sm sm:text-base">
                Subscribe to our newsletter today and receive a premium welcome email containing your exclusive 20% discount coupon code instantly!
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <AnimatePresence mode="wait">
                {!success ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-3 w-full"
                  >
                    <div className="relative flex-1">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/50" />
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 pl-11 pr-4 bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/30 focus-visible:border-primary-foreground/40 rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      size="lg"
                      className="h-12 px-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Claim 20% Off
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 bg-primary-foreground/10 border border-primary-foreground/20 rounded-2xl p-5 text-white"
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Subscription Active!</h4>
                      <p className="text-sm text-primary-foreground/80 mt-0.5">
                        Please check your inbox at <strong>{email}</strong> for your 20% off coupon code.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isAuthenticated && !success && (
                <p className="text-xs text-primary-foreground/60 mt-3 text-center lg:text-left">
                  * Note: You are logged out. To trigger real email delivery to your inbox, please{' '}
                  <Link to="/login" className="underline hover:text-white transition-colors">
                    sign in
                  </Link>{' '}
                  first.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PromoBanner;
