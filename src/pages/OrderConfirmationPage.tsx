import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, MapPin, Truck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import { supabase } from '@/integrations/supabase/client';
import {
  clearIveriCheckoutSession,
  isIveriPaymentSuccess,
  loadIveriPendingOrder,
  parseIveriFromUrl,
  type IveriPendingOrder,
} from '@/utils/iveri';

const shippingLabels: Record<string, string> = {
  pickup: 'Store Pickup',
  standard: 'Standard Shipping (5–7 days)',
  express: 'Express Shipping (1–3 days)',
};

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<IveriPendingOrder | undefined>(
    location.state as IveriPendingOrder | undefined,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromState = location.state as IveriPendingOrder | undefined;
    if (fromState?.orderNumber) {
      setOrder(fromState);
      return;
    }

    const orderNumber = searchParams.get('order');
    if (!orderNumber) return;

    const saved = loadIveriPendingOrder<IveriPendingOrder>(orderNumber);
    if (saved) {
      setOrder(saved);
    }
  }, [location.state, searchParams]);

  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const nonce = searchParams.get('nonce');
    const urlStatus = searchParams.get('status');
    if (!orderNumber || !nonce || urlStatus !== 'success') return;

    const parsed = parseIveriFromUrl(searchParams.toString(), location.hash);
    const iveriStatus = parsed.status ?? '0';

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (isIveriPaymentSuccess(iveriStatus)) {
          await supabase.functions.invoke('iveri-gateway', {
            body: {
              action: 'confirm-payment',
              orderNumber,
              checkoutNonce: nonce,
              litePaymentCardStatus: String(iveriStatus),
              transactionIndex: parsed.transactionIndex ?? undefined,
            },
          });
        }
        clearIveriCheckoutSession(orderNumber);
      } catch (e) {
        console.error('[OrderConfirmation] iVeri return handling:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, location.hash]);

  if (!order) {
    const orderNumber = searchParams.get('order');
    if (loading || (orderNumber && searchParams.get('status') === 'success')) {
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
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 container py-12">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--success))]/10 p-4 mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-[hsl(var(--success))]" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your order number is{' '}
              <span className="font-semibold text-foreground">{order.orderNumber}</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order items
              </h2>
              <ul className="space-y-3">
                {order.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                    </div>
                    <p className="font-medium text-sm">${(item.price * item.qty).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Shipping
              </h2>
              <p className="text-sm text-muted-foreground">
                {shippingLabels[order.shippingMethod] ?? order.shippingMethod}
                {order.shippingCost > 0 && ` — $${order.shippingCost.toFixed(2)}`}
              </p>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                  <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                  <p className="text-muted-foreground mt-1">{order.shippingAddress.email}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="p-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/orders')} variant="outline">
              View order history
            </Button>
            <Button onClick={() => navigate('/discover')} className="bg-gradient-primary gap-2">
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmationPage;
