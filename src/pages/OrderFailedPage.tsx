import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, Package, AlertCircle, RefreshCw, ShoppingBag, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import { supabase } from '@/integrations/supabase/client';
import {
  loadIveriPendingOrder,
  parseIveriFromUrl,
  type IveriPendingOrder,
} from '@/utils/iveri';

const OrderFailedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<IveriPendingOrder | undefined>(undefined);
  const [errorDescription, setErrorDescription] = useState<string>('Your payment transaction was declined or cancelled.');

  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const nonce = searchParams.get('nonce');
    
    if (orderNumber) {
      const saved = loadIveriPendingOrder<IveriPendingOrder>(orderNumber);
      if (saved) {
        setOrder(saved);
      }
    }

    const parsed = parseIveriFromUrl(searchParams.toString(), location.hash);
    if (parsed.description) {
      setErrorDescription(parsed.description);
    } else if (searchParams.get('description')) {
      setErrorDescription(searchParams.get('description') || '');
    }

    if (orderNumber && nonce) {
      const iveriStatus = parsed.status ?? '255'; // Default to error if not found
      (async () => {
        try {
          await supabase.functions.invoke('iveri-gateway', {
            body: {
              action: 'confirm-payment',
              orderNumber,
              checkoutNonce: nonce,
              litePaymentCardStatus: String(iveriStatus),
              transactionIndex: parsed.transactionIndex ?? undefined,
            },
          });
        } catch (e) {
          console.error('[OrderFailed] failed updating status on server:', e);
        }
      })();
    }
  }, [searchParams, location.hash]);

  const handleRetryPayment = () => {
    const orderNumber = searchParams.get('order');
    if (orderNumber) {
      navigate(`/checkout?retry=${encodeURIComponent(orderNumber)}`);
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 container py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--destructive))]/10 p-4 mb-4"
            >
              <XCircle className="h-12 w-12 text-[hsl(var(--destructive))]" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">Payment Unsuccessful</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              We couldn't process your payment. 
              {order?.orderNumber && (
                <span> Reference: <span className="font-semibold text-foreground">{order.orderNumber}</span></span>
              )}
            </p>
          </motion.div>

          {/* Failure Alert Box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8 rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 text-sm text-destructive-foreground/90"
          >
            <AlertCircle className="h-5 w-5 text-[hsl(var(--destructive))] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Reason for failure</p>
              <p className="text-muted-foreground mt-0.5">{errorDescription}</p>
            </div>
          </motion.div>

          {/* Order Summary (if order loaded) */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border overflow-hidden bg-card/40 backdrop-blur-sm"
            >
              <div className="p-6 space-y-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  Order Summary
                </h2>
                <ul className="space-y-3">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-12 rounded-lg object-cover border border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                      </div>
                      <p className="font-medium text-sm text-foreground">${(item.price * item.qty).toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
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
          )}

          {/* Action Call-to-actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRetryPayment} className="bg-gradient-primary gap-2 min-h-[44px]">
              <RefreshCw className="h-4 w-4" />
              Retry Checkout
            </Button>
            <Button onClick={() => navigate('/discover')} variant="outline" className="gap-2 min-h-[44px]">
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Button>
            <Button onClick={() => navigate('/help-center')} variant="ghost" className="gap-2 min-h-[44px]">
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderFailedPage;
