import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Loader2, ShoppingBag, Star, MessageSquare } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/orders/PaymentStatusBadge';

type OrderRow = Tables<'orders'> & {
  order_items?: (Tables<'order_items'> & { products?: { name: string; slug: string } | null })[];
  shops?: { name: string } | null;
};

const OrderHistoryPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('orders')
      .select('*, order_items(*, products(name, slug)), shops(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as OrderRow[]);
        setLoading(false);
      });
  }, [user]);

  const deliveredOrderProductIds = useMemo(() => {
    const ids: string[] = [];
    orders.forEach((o) => {
      if (o.status !== 'delivered' || !o.order_items) return;
      o.order_items.forEach((oi) => {
        if (oi.product_id) ids.push(oi.product_id);
      });
    });
    return [...new Set(ids)];
  }, [orders]);

  useEffect(() => {
    if (!user || deliveredOrderProductIds.length === 0) return;
    supabase
      .from('reviews')
      .select('product_id')
      .eq('user_id', user.id)
      .in('product_id', deliveredOrderProductIds)
      .then(({ data }) => {
        setReviewedProductIds(new Set((data ?? []).map((r) => r.product_id)));
      });
  }, [user, deliveredOrderProductIds.join(',')]);

  const unreviewedDeliveredProducts = useMemo(() => {
    const list: { productId: string; productName: string; productSlug: string }[] = [];
    orders.forEach((o) => {
      if (o.status !== 'delivered' || !o.order_items) return;
      o.order_items.forEach((oi) => {
        if (!oi.product_id || reviewedProductIds.has(oi.product_id)) return;
        const name = oi.products?.name ?? 'Product';
        const slug = oi.products?.slug;
        if (slug && !list.some((x) => x.productId === oi.product_id)) {
          list.push({ productId: oi.product_id, productName: name, productSlug: slug });
        }
      });
    });
    return list;
  }, [orders, reviewedProductIds]);

  if (!authLoading && !user) {
    navigate('/auth', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 container py-8">
        <div className="flex items-center gap-2 mb-8">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Order history</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 rounded-xl border border-border bg-card"
          >
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Orders you place will appear here so you can track status and details.
            </p>
            <Link to="/discover">
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <ShoppingBag className="h-4 w-4" />
                Start shopping
              </span>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {unreviewedDeliveredProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-2">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground mb-1">How was your order?</h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      You have delivered items waiting for your review. Your feedback helps other shoppers and sellers.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unreviewedDeliveredProducts.map((p) => (
                        <Button key={p.productId} variant="secondary" size="sm" asChild>
                          <Link to={`/product/${p.productSlug}/reviews`}>
                            <MessageSquare className="h-4 w-4 mr-1.5" />
                            Review {p.productName}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              {orders.map((order) => {
                const isDelivered = order.status === 'delivered';
                const unreviewedInOrder = isDelivered && order.order_items
                  ? order.order_items.filter((oi) => oi.product_id && !reviewedProductIds.has(oi.product_id) && oi.products?.slug)
                  : [];
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="text-base font-mono">
                            {order.order_number ?? `#${order.id.slice(0, 8)}`}
                          </CardTitle>
                          <span className="text-sm text-muted-foreground">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString()
                              : '—'}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              order.status === 'delivered'
                                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                                : order.status === 'cancelled'
                                  ? 'bg-destructive/20 text-destructive'
                                  : 'bg-primary/20 text-primary'
                            )}
                          >
                            {order.status ?? 'pending'}
                          </span>
                        </div>
                        <PaymentStatusBadge
                          paymentStatus={order.payment_status}
                          paymentMethod={order.payment_method}
                          className="mt-2"
                        />
                        {order.shops?.name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            From {order.shops.name}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="font-semibold">${Number(order.total).toFixed(2)} total</p>
                        {order.order_items && order.order_items.length > 0 && (
                          <ul className="space-y-1 text-sm text-muted-foreground border-t border-border pt-2">
                            {order.order_items.map((oi) => (
                              <li key={oi.id} className="flex justify-between">
                                <span>
                                  {oi.products?.name ?? 'Product'} × {oi.quantity}
                                </span>
                                <span>${Number(oi.price * oi.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {unreviewedInOrder.length > 0 && (
                          <div className="border-t border-border pt-3 mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Leave a review</p>
                            <div className="flex flex-wrap gap-2">
                              {unreviewedInOrder.map((oi) => (
                                <Button key={oi.id} variant="outline" size="sm" asChild>
                                  <Link to={`/product/${oi.products?.slug ?? ''}/reviews`}>
                                    <Star className="h-3.5 w-3.5 mr-1" />
                                    {oi.products?.name ?? 'Product'}
                                  </Link>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrderHistoryPage;
