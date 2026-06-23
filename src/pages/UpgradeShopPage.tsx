import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, CreditCard, Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import {
  generateIveriOrderNumber,
  saveIveriCheckoutSession,
  type IveriPendingOrder,
} from '@/utils/iveri';

const billingSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(7, 'Phone number is required').max(20),
  address: z.string().trim().min(1, 'Address is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State/Province is required').max(100),
  zipCode: z.string().trim().min(1, 'Zip/Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(100),
});

type BillingForm = z.infer<typeof billingSchema>;

const planDetails: Record<string, { price: number; name: string; features: string[] }> = {
  starter: {
    price: 0,
    name: 'Starter',
    features: ['Up to 10 products', 'Basic analytics', 'Standard support', '2% commission per sale'],
  },
  growth: {
    price: 15.00,
    name: 'Growth',
    features: ['Up to 100 products', 'Advanced analytics', 'Priority support', '1.5% commission per sale', 'Custom shop branding', 'Promotional tools'],
  },
  enterprise: {
    price: 99.00,
    name: 'Enterprise',
    features: ['Unlimited products', 'Full analytics suite', 'Dedicated account manager', '1% commission per sale', 'API access', 'Custom integrations'],
  },
};

const UpgradeShopPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [shop, setShop] = useState<any>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BillingForm, string>>>({});
  
  const targetPlan = (searchParams.get('plan') || 'growth').toLowerCase();
  const planInfo = planDetails[targetPlan] || planDetails.growth;

  const [form, setForm] = useState<BillingForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '123 Main Street',
    city: 'Harare',
    state: 'Harare',
    zipCode: '0000',
    country: 'Zimbabwe',
  });

  useEffect(() => {
    if (!user) return;

    // Load existing shop and profile details
    (async () => {
      try {
        const { data: shopData } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();
        
        setShop(shopData);

        let profile: any = null;
        const { data: byId } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (byId) {
          profile = byId;
        } else {
          try {
            const { data: byUserId } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            if (byUserId) {
              profile = byUserId;
            }
          } catch (err) {
            console.warn('Fallback profile query by user_id failed:', err);
          }
        }

        if (profile) {
          const names = (profile.full_name || '').split(' ');
          setForm(prev => ({
            ...prev,
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            email: user.email || '',
            phone: (profile as any).phone || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching shop / profile:', err);
      } finally {
        setLoadingShop(false);
      }
    })();
  }, [user]);

  const updateField = (field: keyof BillingForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFreeDowngrade = async () => {
    if (!shop) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ pricing_tier: targetPlan })
        .eq('id', shop.id);

      if (error) throw error;

      toast({
        title: 'Plan Updated',
        description: `Your shop has been switched to the ${planInfo.name} plan.`,
      });
      navigate('/seller-dashboard');
    } catch (err: any) {
      toast({
        title: 'Error updating plan',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !user) return;

    const result = billingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof BillingForm, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof BillingForm;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      toast({ title: 'Please fix the errors in the form', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    const orderNumber = generateIveriOrderNumber();

    try {
      // Initiate subscription payment via iVeri Edge Function
      const { data, error } = await supabase.functions.invoke('iveri-gateway', {
        body: {
          items: [
            {
              id: `plan-${targetPlan}`,
              product: { id: `plan-${targetPlan}`, name: `${planInfo.name} Plan Subscription Upgrade`, price: planInfo.price, images: [] },
              shop: { id: shop.id, name: shop.name },
              quantity: 1,
            },
          ],
          address: result.data,
          shippingMethod: `plan_upgrade:${targetPlan}`,
          shippingCost: 0,
        },
      });

      if (error || !data || !data.success) {
        throw new Error(error?.message || data?.error || 'Could not connect to payment gateway.');
      }

      const {
        gatewayUrl,
        formFields,
        orderNumber: gatewayOrderNumber,
        checkoutNonce,
        merchantTrace,
      } = data;

      const cleanGatewayUrl = (gatewayUrl || '').replace(/^\uFEFF/, '').trim();

      const pendingOrder: IveriPendingOrder = {
        orderNumber: gatewayOrderNumber,
        items: [
          {
            name: `${planInfo.name} Plan Subscription Upgrade`,
            qty: 1,
            price: planInfo.price,
            image: '',
          },
        ],
        shippingAddress: result.data,
        shippingMethod: `plan_upgrade:${targetPlan}`,
        shippingCost: 0,
        subtotal: planInfo.price,
        total: planInfo.price,
        checkoutNonce,
        merchantTrace,
      };

      saveIveriCheckoutSession(gatewayOrderNumber, checkoutNonce, pendingOrder);

      // Create hidden POST form to submit to iVeri portal
      const oldForm = document.getElementById('tenga-upgrade-form');
      if (oldForm) oldForm.remove();

      const payForm = document.createElement('form');
      payForm.id = 'tenga-upgrade-form';
      payForm.method = 'POST';
      payForm.action = cleanGatewayUrl;
      payForm.style.display = 'none';

      Object.entries(formFields).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(val);
        payForm.appendChild(input);
      });

      document.body.appendChild(payForm);
      payForm.submit();
    } catch (err: any) {
      console.error('[Upgrade] Initialization failure:', err);
      toast({
        title: 'Payment initiation failed',
        description: err.message || 'Could not connect to iVeri gateway.',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please log in to upgrade your shop plan.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadingShop) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold mb-4">No Shop Found</h2>
          <p className="text-muted-foreground mb-6">You need to have an active shop in order to upgrade its plan.</p>
          <Button onClick={() => navigate(`/open-shop?plan=${targetPlan}`)}>Open a Shop</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isCurrentPlan = shop.pricing_tier === targetPlan;
  const isFreePlan = planInfo.price === 0;

  return (
    <div className="min-h-screen flex flex-col relative bg-background overflow-hidden">
      {processing && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Shield className="h-8 w-8 text-primary absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Redirecting to Payment Gateway</h2>
          <p className="text-muted-foreground max-w-sm text-sm mb-1">
            Redirecting you to the secure CBZ/iVeri payment portal. Please do not close or refresh this page.
          </p>
          <p className="text-xs text-primary/80 font-medium animate-pulse">Your session is secure.</p>
        </div>
      )}

      <Header />

      <main className="flex-1 container py-8 sm:py-12 px-4 sm:px-6 relative z-10 max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-6 -ml-2 min-h-[44px]" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Confirm Plan Upgrade</h1>
          <p className="text-muted-foreground mt-2">
            Upgrading <span className="font-semibold text-foreground">"{shop.name}"</span> from{' '}
            <span className="capitalize font-semibold text-foreground">{shop.pricing_tier}</span> to{' '}
            <span className="capitalize font-semibold text-foreground">{targetPlan}</span>
          </p>
        </div>

        {isCurrentPlan ? (
          <div className="rounded-xl border border-border p-8 text-center max-w-md mx-auto bg-card/50 backdrop-blur-md">
            <h3 className="text-lg font-bold mb-2">Already Active</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your shop is already running on the {planInfo.name} plan. No changes are required.
            </p>
            <Button onClick={() => navigate('/seller-dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
            {/* Features Highlight */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md p-6">
                <h3 className="text-lg font-bold mb-1">{planInfo.name} Plan Benefits</h3>
                <p className="text-xs text-muted-foreground mb-4">Here is what you will unlock:</p>
                <ul className="space-y-3.5">
                  {planInfo.features.map(feat => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mt-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="leading-tight text-foreground/90">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card/20 p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Subscription Price</p>
                <div className="text-3xl font-extrabold mt-1">
                  {isFreePlan ? 'Free' : `$${planInfo.price.toFixed(2)}`}
                  {!isFreePlan && <span className="text-xs font-semibold text-muted-foreground">/mo</span>}
                </div>
              </div>
            </div>

            {/* Payment / Downgrade Form */}
            <div className="md:col-span-3">
              {isFreePlan ? (
                <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md p-6 space-y-6">
                  <h3 className="text-lg font-bold">Switching to Starter</h3>
                  <p className="text-sm text-muted-foreground">
                    Downgrading to the Starter plan is free. Please note that premium tools such as custom banners and promo emails will be locked, and your product listing limit will be set to 10.
                  </p>
                  <Button
                    onClick={handleFreeDowngrade}
                    disabled={processing}
                    className="w-full h-11 bg-primary text-sm font-semibold tracking-wide"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Switch to Starter'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePayUpgrade} className="rounded-xl border border-border bg-card/40 backdrop-blur-md p-6 space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Billing & Payment Details
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="First Name" error={errors.firstName}>
                      <Input value={form.firstName} onChange={e => updateField('firstName', e.target.value)} placeholder="John" />
                    </FormField>
                    <FormField label="Last Name" error={errors.lastName}>
                      <Input value={form.lastName} onChange={e => updateField('lastName', e.target.value)} placeholder="Doe" />
                    </FormField>
                    <div className="sm:col-span-2">
                      <FormField label="Billing Email" error={errors.email}>
                        <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="john@example.com" />
                      </FormField>
                    </div>
                    <div className="sm:col-span-2">
                      <FormField label="Phone" error={errors.phone}>
                        <Input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+263 7..." />
                      </FormField>
                    </div>
                    <div className="sm:col-span-2">
                      <FormField label="Billing Address" error={errors.address}>
                        <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="123 Main Street" />
                      </FormField>
                    </div>
                    <FormField label="City" error={errors.city}>
                      <Input value={form.city} onChange={e => updateField('city', e.target.value)} />
                    </FormField>
                    <FormField label="State" error={errors.state}>
                      <Input value={form.state} onChange={e => updateField('state', e.target.value)} />
                    </FormField>
                    <FormField label="Zip" error={errors.zipCode}>
                      <Input value={form.zipCode} onChange={e => updateField('zipCode', e.target.value)} />
                    </FormField>
                    <FormField label="Country" error={errors.country}>
                      <Input value={form.country} onChange={e => updateField('country', e.target.value)} />
                    </FormField>
                  </div>

                  <Separator />

                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full h-11 bg-gradient-primary text-sm font-semibold tracking-wide"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Proceed to Pay $${planInfo.price.toFixed(2)}`
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Securely processed via CBZ/iVeri Nedbank portal</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const FormField = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5 text-left">
    <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
    {children}
    {error && <p className="text-[10px] text-destructive">{error}</p>}
  </div>
);

export default UpgradeShopPage;
