import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Minus, Plus, X, Truck, Shield, CreditCard, Loader2, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendTransactionalEmail } from '@/utils/emailService';
import {
  generateIveriOrderNumber,
  IVERI_NONCE_FIELD,
  isIveriPaymentSuccess,
  loadIveriPendingOrder,
  parseIveriFromUrl,
  saveIveriCheckoutSession,
  verifyIveriNonce,
  type IveriPendingOrder,
} from '@/utils/iveri';

const addressSchema = z.object({
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

type AddressForm = z.infer<typeof addressSchema>;
type PaymentMethod = 'iveri' | 'cod';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('iveri');
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});
  const [form, setForm] = useState<AddressForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  const shippingCost = shippingMethod === 'express' ? 14.99 : shippingMethod === 'standard' ? 5.99 : 0;
  const orderTotal = totalPrice + shippingCost;

  useEffect(() => {
    const status = searchParams.get('status');
    if (status !== 'failed') return;

    const parsed = parseIveriFromUrl(searchParams.toString());
    toast({
      title: 'Payment not completed',
      description: parsed.description || 'Your payment was declined or cancelled. You can try again.',
      variant: 'destructive',
    });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  const updateField = (field: keyof AddressForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const confirmPaymentOnServer = async (
    orderNumber: string,
    checkoutNonce: string,
    litePaymentCardStatus: string,
    transactionIndex?: string | null,
  ) => {
    const { data, error } = await supabase.functions.invoke('iveri-gateway', {
      body: {
        action: 'confirm-payment',
        orderNumber,
        checkoutNonce,
        litePaymentCardStatus,
        transactionIndex: transactionIndex ?? undefined,
      },
    });
    if (error || !data?.success) {
      console.warn('[iVeri] confirm-payment:', error || data);
    }
    return data;
  };

  const triggerLiteBoxPayment = (
    gatewayUrl: string,
    portalUrl: string,
    formFields: Record<string, string>,
    addressData: AddressForm,
    orderNumber: string,
    checkoutNonce: string,
    merchantTrace: string,
    pendingOrder: IveriPendingOrder,
  ) => {
    saveIveriCheckoutSession(orderNumber, checkoutNonce, pendingOrder);

    const oldForm = document.getElementById('tenga-iveri-form');
    if (oldForm) oldForm.remove();

    const payForm = document.createElement('form');
    payForm.id = 'tenga-iveri-form';
    payForm.method = 'POST';
    payForm.action = gatewayUrl;
    payForm.style.display = 'none';

    Object.entries(formFields).forEach(([key, val]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(val);
      payForm.appendChild(input);
    });

    const triggerLink = document.createElement('a');
    triggerLink.id = 'iveri-litebox-button';
    triggerLink.href = '#';
    triggerLink.textContent = 'Pay';
    triggerLink.style.display = 'none';
    payForm.appendChild(triggerLink);

    document.body.appendChild(payForm);

    const loadStylesheet = (href: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`link[href="${href}"]`)) {
          resolve();
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        document.head.appendChild(link);
      });
    };

    const loadScript = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          if (scripts[i].src === url) {
            resolve();
            return;
          }
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
      });
    };

    // Load assets dynamically and pop up the LiteBox modal
    const startLiteBox = async () => {
      try {
        toast({
          title: '🔐 Securing Gateway...',
          description: 'Loading secure payment checkout dialog.',
        });

        // 1. Load JQuery if not present
        if (!(window as any).$) {
          await loadScript('https://code.jquery.com/jquery-3.6.0.min.js');
        }

        const $ = (window as any).$;

        await loadStylesheet('https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js');
        await loadScript(`${portalUrl}/scripts/jquery/js/jquery.litebox.js`);

        (window as any).liteboxComplete = async (data: Record<string, unknown>) => {
          console.log('[iVeri LiteBox] Payment Complete Callback:', data);
          setPlacing(false);

          const confirmedOrderNumber = String(
            data.Ecom_ConsumerOrderID || formFields.Ecom_ConsumerOrderID || orderNumber,
          );
          const receivedNonce = data[IVERI_NONCE_FIELD] != null ? String(data[IVERI_NONCE_FIELD]) : null;

          if (!verifyIveriNonce(receivedNonce, confirmedOrderNumber)) {
            toast({
              title: 'Security check failed',
              description: 'Payment response could not be verified. Please contact support with your order reference.',
              variant: 'destructive',
            });
            return;
          }

          const status = data.Lite_Payment_Card_Status ?? data.Lite_Status;
          const transactionIndex = data.Lite_TransactionIndex
            ? String(data.Lite_TransactionIndex)
            : null;

          if (isIveriPaymentSuccess(status)) {
            await confirmPaymentOnServer(
              confirmedOrderNumber,
              checkoutNonce,
              String(status),
              transactionIndex,
            );

            try {
              await supabase.functions.invoke('iveri-gateway', {
                body: { action: 'verify-transaction', merchantTrace },
              });
            } catch {
              /* AuthoriseInfo is advisory */
            }

            toast({
              title: 'Payment successful',
              description: 'Your order has been authorized.',
            });
            clearCart();
            navigate(`/order-confirmation?status=success&order=${encodeURIComponent(confirmedOrderNumber)}&nonce=${encodeURIComponent(checkoutNonce)}`, {
              state: pendingOrder,
            });
          } else {
            await confirmPaymentOnServer(
              confirmedOrderNumber,
              checkoutNonce,
              String(status ?? 'failed'),
              transactionIndex,
            );
            toast({
              title: 'Payment Declined',
              description: String(data.Lite_Result_Description || 'The transaction was refused or cancelled.'),
              variant: 'destructive',
            });
          }
        };

        // 5. Watch for modal closing event in bootstrap to clean up our places loading state if modal is manually closed
        $(document).on('hidden.bs.modal', '#liteboxModal, .modal', function () {
          console.log('[iVeri LiteBox] Modal closed by user');
          setPlacing(false);
        });

        // 6. Initialize iVeri LiteBox
        if (typeof (window as any).liteboxInitialise === 'function') {
          (window as any).liteboxInitialise(portalUrl);
        }

        // 7. Fire click event to trigger pop up modal!
        setTimeout(() => {
          const btn = document.getElementById('iveri-litebox-button');
          if (btn) btn.click();
        }, 150);

      } catch (err) {
        console.error('[iVeri LiteBox] Loading failed, running direct redirect fallback:', err);
        payForm.submit();
      }
    };

    startLiteBox();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = addressSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AddressForm, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof AddressForm;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      toast({ title: 'Please fix the errors in the form', variant: 'destructive' });
      return;
    }

    const orderNumber = generateIveriOrderNumber();
    const confirmationState: IveriPendingOrder = {
      orderNumber,
      items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price, image: i.product.images[0] })),
      shippingAddress: result.data,
      shippingMethod,
      shippingCost,
      subtotal: totalPrice,
      total: orderTotal,
    };

    // --- CASE 1: ONLINE CARD / MOBILE PAYMENT VIA IVERI (NEDBANK LITEBOX MODAL) ---
    if (paymentMethod === 'iveri') {
      if (!user) {
        toast({
          title: 'Account Required',
          description: 'Please sign in to complete secure online card payments.',
          variant: 'destructive'
        });
        return;
      }

      setPlacing(true);
      try {
        console.log('[iVeri] Initializing LiteBox payment for order:', orderNumber);

        const { data, error } = await supabase.functions.invoke('iveri-gateway', {
          body: {
            items,
            address: result.data,
            shippingMethod,
            shippingCost,
          },
        });

        if (error || !data || !data.success) {
          console.error('[iVeri] Payment Init Failed:', error || data);
          toast({
            title: 'Payment Gateway Error',
            description: error?.message || data?.error || 'Could not connect to iVeri Payment Gateway.',
            variant: 'destructive',
          });
          setPlacing(false);
          return;
        }

        const {
          gatewayUrl,
          portalUrl,
          formFields,
          orderNumber: gatewayOrderNumber,
          checkoutNonce,
          merchantTrace,
        } = data;

        // Clean UTF-8 BOM (\uFEFF) and whitespace from gateway URLs
        const cleanGatewayUrl = (gatewayUrl || '').replace(/^\uFEFF/, '').trim();
        const cleanPortalUrl = (portalUrl || '').replace(/^\uFEFF/, '').trim();

        const pendingOrder: IveriPendingOrder = {
          ...confirmationState,
          orderNumber: gatewayOrderNumber,
          checkoutNonce,
          merchantTrace,
        };

        triggerLiteBoxPayment(
          cleanGatewayUrl,
          cleanPortalUrl,
          formFields,
          result.data,
          gatewayOrderNumber,
          checkoutNonce,
          merchantTrace,
          pendingOrder,
        );
        return;
      } catch (err) {
        console.error('[iVeri] Direct connection failure:', err);
        toast({
          title: 'Payment error',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
        setPlacing(false);
        return;
      }
    }

    // --- CASE 2: CASH ON DELIVERY / PAY ON PICKUP ---
    if (!user) {
      toast({
        title: 'Account required',
        description: 'Please sign in to place an order.',
        variant: 'destructive',
      });
      return;
    }

    setPlacing(true);
    {
      const byShop = new Map<string, typeof items>();
      for (const item of items) {
        const sid = item.shop.id;
        if (!byShop.has(sid)) byShop.set(sid, []);
        byShop.get(sid)!.push(item);
      }
      try {
        const addr = result.data;
        for (const [shopId, shopItems] of byShop) {
          const orderTotalForShop = shopItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              shop_id: shopId,
              total: orderTotalForShop,
              status: 'pending',
              order_number: orderNumber,
              customer_name: `${addr.firstName} ${addr.lastName}`.trim(),
              customer_email: addr.email,
              customer_phone: addr.phone,
              shipping_address: addr.address,
              shipping_city: addr.city,
              shipping_state: addr.state,
              shipping_zip_code: addr.zipCode,
              shipping_country: addr.country,
              shipping_method: shippingMethod,
              payment_method: 'cash_on_delivery',
              payment_status: 'pending',
            })
            .select('id')
            .single();
          if (orderError) {
            toast({ title: 'Could not create order', description: orderError.message, variant: 'destructive' });
            setPlacing(false);
            return;
          }
          for (const it of shopItems) {
            const { error: itemError } = await supabase.from('order_items').insert({
              order_id: order.id,
              product_id: it.product.id,
              quantity: it.quantity,
              price: Number(it.product.price),
            });
            if (itemError) {
              toast({ title: 'Could not save order items', description: itemError.message, variant: 'destructive' });
              setPlacing(false);
              return;
            }
          }
        }

        await sendTransactionalEmail({
          action: 'order-confirmation',
          email: addr.email,
          customerName: `${addr.firstName} ${addr.lastName}`.trim(),
          orderNumber,
          shippingMethod,
          total: orderTotal,
          items: items.map((i) => ({
            name: i.product.name,
            qty: i.quantity,
            price: Number(i.product.price),
          })),
        });
      } finally {
        setPlacing(false);
      }
    }

    clearCart();
    navigate('/order-confirmation', { state: confirmationState });
  };

  const placeOrderLabel =
    paymentMethod === 'iveri'
      ? placing
        ? 'Opening secure payment…'
        : 'Pay securely'
      : placing
        ? 'Placing order…'
        : 'Place order';

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
          <div className="rounded-full bg-secondary p-6 mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some items to your cart to checkout.</p>
          <Button onClick={() => navigate('/discover')} className="bg-gradient-primary">
            Continue Shopping
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Target container for iVeri LiteBox modal rendering */}
      <div id="iveri-litebox"></div>

      {/* Premium custom glassmorphic styling for the iVeri LiteBox payment popup */}
      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(8px) !important;
          z-index: 1040;
        }
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1050;
          display: none;
          width: 100%;
          height: 100%;
          overflow: hidden;
          outline: 0;
        }
        .modal.show {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .modal-dialog {
          position: relative;
          width: 100% !important;
          max-width: 550px !important;
          margin: 1.75rem auto !important;
          pointer-events: none;
          z-index: 1060;
        }
        .modal-content {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          pointer-events: auto;
          background-color: hsl(var(--background)) !important;
          background-clip: padding-box;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 16px !important;
          outline: 0;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          overflow: hidden !important;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        .modal-header .btn-close, .modal-header .close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
        }
        .modal-body {
          position: relative;
          flex: 1 1 auto;
          padding: 0 !important;
          height: 600px !important;
          background: hsl(var(--background)) !important;
        }
        .modal-body iframe {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          border-radius: 0 0 16px 16px !important;
        }
      `}</style>

      {/* Immersive secure gateway redirect overlay */}
      {placing && paymentMethod === 'iveri' && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Shield className="h-8 w-8 text-primary absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connecting to Secure Gateway</h2>
          <p className="text-muted-foreground max-w-sm text-sm mb-1">
            Loading secure payment interface inside a pop-up dialog. Please do not refresh this page.
          </p>
          <p className="text-xs text-primary/80 font-medium animate-pulse">Your session is encrypted.</p>
        </div>
      )}
      <Header />
      <CartDrawer />

      <main className="flex-1 container py-6 sm:py-8 px-4 sm:px-6">
        {/* Back button */}
        <Button variant="ghost" className="mb-4 sm:mb-6 -ml-2 min-h-[44px]" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column – Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Address */}
              <section className="rounded-xl border border-border p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Shipping Address
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="First Name" error={errors.firstName}>
                    <Input value={form.firstName} onChange={e => updateField('firstName', e.target.value)} placeholder="John" />
                  </FormField>
                  <FormField label="Last Name" error={errors.lastName}>
                    <Input value={form.lastName} onChange={e => updateField('lastName', e.target.value)} placeholder="Doe" />
                  </FormField>
                  <FormField label="Email" error={errors.email}>
                    <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="john@example.com" />
                  </FormField>
                  <FormField label="Phone" error={errors.phone}>
                    <Input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+1 234 567 890" />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Street Address" error={errors.address}>
                      <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="123 Main Street" />
                    </FormField>
                  </div>
                  <FormField label="City" error={errors.city}>
                    <Input value={form.city} onChange={e => updateField('city', e.target.value)} placeholder="New York" />
                  </FormField>
                  <FormField label="State / Province" error={errors.state}>
                    <Input value={form.state} onChange={e => updateField('state', e.target.value)} placeholder="NY" />
                  </FormField>
                  <FormField label="Zip / Postal Code" error={errors.zipCode}>
                    <Input value={form.zipCode} onChange={e => updateField('zipCode', e.target.value)} placeholder="10001" />
                  </FormField>
                  <FormField label="Country" error={errors.country}>
                    <Input value={form.country} onChange={e => updateField('country', e.target.value)} placeholder="United States" />
                  </FormField>
                </div>
              </section>

              {/* Shipping Method */}
              <section className="rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Shipping Method
                </h2>
                <RadioGroup value={shippingMethod} onValueChange={setShippingMethod} className="space-y-3">
                  {[
                    { value: 'pickup', label: 'Store Pickup', desc: 'Pick up from nearest store', price: 'Free' },
                    { value: 'standard', label: 'Standard Shipping', desc: '5–7 business days', price: '$5.99' },
                    { value: 'express', label: 'Express Shipping', desc: '1–3 business days', price: '$14.99' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-between rounded-lg border p-4 min-h-[56px] cursor-pointer transition-colors ${shippingMethod === opt.value ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RadioGroupItem value={opt.value} className="flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">{opt.price}</span>
                    </label>
                  ))}
                </RadioGroup>
              </section>

              {/* Payment method */}
              <section className="rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Method
                </h2>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="space-y-3"
                >
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'iveri' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <RadioGroupItem value="iveri" className="mt-1 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold text-sm">Secure online payment (iVeri)</p>
                      <p className="text-xs text-muted-foreground">
                        EcoCash, OneMoney, ZimSwitch, Visa, Mastercard — via CBZ/iVeri LiteBox.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['EcoCash', 'OneMoney', 'ZimSwitch', 'Visa', 'Mastercard'].map((label) => (
                          <span key={label} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-background border border-border">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <RadioGroupItem value="cod" className="mt-1 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Pay on delivery / pickup
                      </p>
                      <p className="text-xs text-muted-foreground">
                        No card required now. Pay when your order arrives or when you collect in store.
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {paymentMethod === 'iveri' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded-lg border border-border/40">
                    <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>You must be signed in. A secure payment window will open after you continue.</span>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column – Order Summary */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 rounded-xl border border-border p-4 sm:p-6 space-y-6">
                <h2 className="text-lg font-semibold">Order Summary</h2>

                {/* Items */}
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {items.map(item => (
                    <motion.div key={item.id} layout className="flex gap-3">
                      <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.shop.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-secondary">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-secondary">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">${(item.product.price * item.quantity).toFixed(2)}</span>
                            <button type="button" onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                    <span className="font-medium">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>${orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button type="submit" disabled={placing} className="w-full h-12 bg-gradient-primary text-base font-medium">
                  {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : placeOrderLabel}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Secure checkout
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

/* Tiny helper for labeled form fields with error display */
const FormField = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export default CheckoutPage;
