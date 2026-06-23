import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/utils/emailService';
import type { Tables } from '@/integrations/supabase/types';
import { Store, Check, X, ShieldAlert, Loader2, Users, Shield, Trash2, ExternalLink, TrendingUp, Truck, Package, Plus, MessageCircle, Mail, Send, Search, DollarSign, ClipboardList, Inbox } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type Shop = Tables<'shops'>;
type Product = Tables<'products'> & { shops?: { name: string; slug: string } | null; product_images?: { image_url: string }[] };
type OrderRow = Tables<'orders'> & {
  order_items?: (Tables<'order_items'> & { products?: { name: string } | null })[];
  shops?: { name: string; slug: string } | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  created_at: string | null;
};

const AdminDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [ownerByShopId, setOwnerByShopId] = useState<Record<string, { full_name: string | null; username: string | null }>>({});
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [togglingTrendingId, setTogglingTrendingId] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderTrackingDraft, setOrderTrackingDraft] = useState<Record<string, { status: string; tracking_carrier: string; tracking_number: string }>>({});
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('');
  const [orderFilterShopId, setOrderFilterShopId] = useState<string>('');
  const [orderFilterType, setOrderFilterType] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [manageProductsShopId, setManageProductsShopId] = useState<string | null>(null);
  const [productsForShop, setProductsForShop] = useState<Product[]>([]);
  const [productsForShopLoading, setProductsForShopLoading] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addProductName, setAddProductName] = useState('');
  const [addProductPrice, setAddProductPrice] = useState('');
  const [addProductDescription, setAddProductDescription] = useState('');
  const [addProductImageFile, setAddProductImageFile] = useState<File | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addProductError, setAddProductError] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [adminConversations, setAdminConversations] = useState<{ id: string; shop_id: string; customer_id: string; updated_at: string | null; shops?: { name: string; slug: string } | null }[]>([]);
  const [adminConversationsLoading, setAdminConversationsLoading] = useState(false);
  const [adminSelectedConvId, setAdminSelectedConvId] = useState<string | null>(null);
  const [adminConvMessages, setAdminConvMessages] = useState<{ id: string; sender_id: string; content: string; created_at: string | null }[]>([]);
  const [adminConvMessagesLoading, setAdminConvMessagesLoading] = useState(false);
  const [adminCustomerNames, setAdminCustomerNames] = useState<Record<string, string>>({});
  const [adminShopOwnerIds, setAdminShopOwnerIds] = useState<Record<string, string>>({});
  const [adminPromoSubject, setAdminPromoSubject] = useState('');
  const [adminPromoBody, setAdminPromoBody] = useState('');
  const [adminPromoTier, setAdminPromoTier] = useState<string>('all');
  const [adminPromoSending, setAdminPromoSending] = useState(false);
  const [updatingTierShopId, setUpdatingTierShopId] = useState<string | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminActiveTab, setAdminActiveTab] = useState('shops');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [userFilterDate, setUserFilterDate] = useState<string>('all');
  const [inquiries, setInquiries] = useState<{ id: string; name: string; email: string; message: string; status: string; created_at: string }[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [deletingInquiryId, setDeletingInquiryId] = useState<string | null>(null);
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    (async () => {
      let data: { role: string | null } | null = null;
      const byId = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      data = byId.data;
      if (data == null) {
        const byUserId = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
        data = byUserId.data;
      }
      setProfileRole(data?.role ?? null);
      setProfileLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (profileRole !== 'admin') return;
    (async () => {
      const [pendingRes, allRes] = await Promise.all([
        supabase.from('shops').select('*').eq('is_verified', false).order('created_at', { ascending: false }),
        supabase.from('shops').select('*').order('created_at', { ascending: false }),
      ]);
      const pending = pendingRes.data ?? [];
      const all = allRes.data ?? [];
      if (!pendingRes.error) setPendingShops(pending);
      if (!allRes.error) setAllShops(all);
      const ownerIds = [...new Set([...pending, ...all].map((s) => s.owner_id).filter(Boolean))] as string[];
      const ownerMap: Record<string, { full_name: string | null; username: string | null }> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', ownerIds);
        (profiles ?? []).forEach((row: { id: string; full_name: string | null; username: string | null }) => {
          ownerMap[row.id] = { full_name: row.full_name, username: row.username };
        });
      }
      const byShopId: Record<string, { full_name: string | null; username: string | null }> = {};
      [...pending, ...all].forEach((s) => {
        if (s.owner_id && ownerMap[s.owner_id]) byShopId[s.id] = ownerMap[s.owner_id];
      });
      setOwnerByShopId(byShopId);
      setShopsLoading(false);
    })();
  }, [profileRole]);

  useEffect(() => {
    if (profileRole !== 'admin') return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, role, created_at')
        .order('created_at', { ascending: false });
      if (!error) setUsers((data as ProfileRow[]) ?? []);
      setUsersLoading(false);
    })();
  }, [profileRole]);

  useEffect(() => {
    if (profileRole !== 'admin') return;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(image_url), shops(name, slug)')
        .order('created_at', { ascending: false });
      if (!error && data) setAllProducts(data as Product[]);
      setProductsLoading(false);
    })();
  }, [profileRole]);

  useEffect(() => {
    if (profileRole !== 'admin') return;
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name)), shops(name, slug)')
        .order('created_at', { ascending: false });
      if (!error && data) setAllOrders(data as OrderRow[]);
      setOrdersLoading(false);
    })();
  }, [profileRole]);

  useEffect(() => {
    if (profileRole !== 'admin') return;
    (async () => {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setInquiries(data as any[]);
      }
      setInquiriesLoading(false);
    })();
  }, [profileRole]);

  useEffect(() => {
    if (profileRole !== 'admin') return;
    setAdminConversationsLoading(true);
    supabase
      .from('shop_conversations')
      .select('id, shop_id, customer_id, updated_at, shops(name, slug)')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as { id: string; shop_id: string; customer_id: string; updated_at: string | null; shops?: { name: string; slug: string } | null }[];
        setAdminConversations(list);
        setAdminConversationsLoading(false);
        const customerIds = [...new Set(list.map((c) => c.customer_id))];
        const shopIds = [...new Set(list.map((c) => c.shop_id))];
        if (customerIds.length > 0) {
          supabase.from('profiles').select('id, full_name, username').in('id', customerIds).then(({ data: profs }) => {
            const names: Record<string, string> = {};
            (profs ?? []).forEach((p: { id: string; full_name: string | null; username: string | null }) => {
              names[p.id] = p.full_name || p.username || 'Customer';
            });
            setAdminCustomerNames(names);
          });
        }
        if (shopIds.length > 0) {
          supabase.from('shops').select('id, owner_id').in('id', shopIds).then(({ data: shopRows }) => {
            const map: Record<string, string> = {};
            (shopRows ?? []).forEach((s: { id: string; owner_id: string }) => { map[s.id] = s.owner_id; });
            setAdminShopOwnerIds(map);
          });
        }
      });
  }, [profileRole]);

  useEffect(() => {
    if (!adminSelectedConvId) {
      setAdminConvMessages([]);
      return;
    }
    setAdminConvMessagesLoading(true);
    supabase
      .from('shop_messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', adminSelectedConvId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setAdminConvMessages((data ?? []) as { id: string; sender_id: string; content: string; created_at: string | null }[]);
        setAdminConvMessagesLoading(false);
      });
  }, [adminSelectedConvId]);

  useEffect(() => {
    if (profileRole !== 'admin' || !manageProductsShopId) {
      setProductsForShop([]);
      return;
    }
    setProductsForShopLoading(true);
    supabase
      .from('products')
      .select('*, product_images(image_url), shops(name, slug)')
      .eq('shop_id', manageProductsShopId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProductsForShop((data ?? []) as Product[]);
        setProductsForShopLoading(false);
      });
  }, [profileRole, manageProductsShopId]);

  const slugFromName = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || 'product-' + Date.now();

  const handleAddProductForShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageProductsShopId) return;
    setAddProductError(null);
    const name = addProductName.trim();
    const price = parseFloat(addProductPrice);
    if (!name || isNaN(price) || price < 0) {
      setAddProductError('Name and a valid price are required.');
      return;
    }
    if (!addProductImageFile) {
      setAddProductError('Please add a product image.');
      return;
    }

    // Check shop pricing tier product limits
    const targetShop = allShops.find(s => s.id === manageProductsShopId);
    const tier = (targetShop as any)?.pricing_tier ?? 'starter';
    const currentCount = productsForShop.length;
    if (tier === 'starter' && currentCount >= 10) {
      setAddProductError('This shop has reached the limit of 10 products for the Starter plan.');
      return;
    }
    if (tier === 'growth' && currentCount >= 100) {
      setAddProductError('This shop has reached the limit of 100 products for the Growth plan.');
      return;
    }

    setAddingProduct(true);
    try {
      const slug = slugFromName(name) || 'product-' + Date.now();
      const { data: product, error: insertErr } = await supabase
        .from('products')
        .insert({
          shop_id: manageProductsShopId,
          name,
          slug,
          price,
          description: addProductDescription.trim() || null,
          in_stock: true,
          stock_count: null,
          rating: null,
          review_count: null,
          like_count: null,
        })
        .select('id')
        .single();
      if (insertErr) {
        setAddProductError(insertErr.message);
        setAddingProduct(false);
        return;
      }
      const ext = addProductImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `products/${manageProductsShopId}/${product.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('shop-assets')
        .upload(path, addProductImageFile, { cacheControl: '3600', upsert: false });
      if (uploadErr) {
        setAddProductError('Product created but image upload failed: ' + uploadErr.message);
        setAddingProduct(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(path);
      await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: urlData.publicUrl,
      });
      const { data: updated } = await supabase
        .from('products')
        .select('*, product_images(image_url), shops(name, slug)')
        .eq('shop_id', manageProductsShopId)
        .order('created_at', { ascending: false });
      setProductsForShop((updated ?? []) as Product[]);
      const { data: allUpdated } = await supabase
        .from('products')
        .select('*, product_images(image_url), shops(name, slug)')
        .order('created_at', { ascending: false });
      if (allUpdated) setAllProducts(allUpdated as Product[]);
      setAddProductOpen(false);
      setAddProductName('');
      setAddProductPrice('');
      setAddProductDescription('');
      setAddProductImageFile(null);
      toast({ title: 'Product added', description: `"${name}" has been added to the shop.` });
    } catch (err) {
      setAddProductError(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setAddingProduct(false);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    setDeletingProductId(product.id);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    setDeletingProductId(null);
    if (!error) {
      setProductsForShop((prev) => prev.filter((p) => p.id !== product.id));
      setAllProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast({ title: 'Product removed', description: `"${product.name}" has been deleted.` });
    } else {
      toast({ title: 'Failed to delete product', description: error.message, variant: 'destructive' });
    }
  };

  const getOrderDraft = (order: OrderRow) => {
    const id = order.id;
    if (orderTrackingDraft[id]) return orderTrackingDraft[id];
    const o = order as OrderRow & { tracking_carrier?: string | null; tracking_number?: string | null };
    return {
      status: order.status ?? 'pending',
      tracking_carrier: o.tracking_carrier ?? '',
      tracking_number: o.tracking_number ?? '',
    };
  };

  const filteredOrders = allOrders.filter((order) => {
    if (orderFilterStatus && (order.status ?? 'pending') !== orderFilterStatus) return false;
    if (orderFilterShopId && order.shop_id !== orderFilterShopId) return false;
    if (orderFilterType) {
      const isUpgrade = order.shipping_method?.startsWith('plan_upgrade:');
      if (orderFilterType === 'upgrade' && !isUpgrade) return false;
      if (orderFilterType === 'purchase' && isUpgrade) return false;
    }
    const orderSearch = adminSearchQuery.trim().toLowerCase();
    if (orderSearch) {
      const orderNumber = (order.order_number ?? order.id).toString().toLowerCase();
      const customerName = (order.customer_name ?? '').toLowerCase();
      const customerEmail = (order.customer_email ?? '').toLowerCase();
      const shopName = (order.shops?.name ?? '').toLowerCase();
      if (!orderNumber.includes(orderSearch) && !customerName.includes(orderSearch) && !customerEmail.includes(orderSearch) && !shopName.includes(orderSearch)) return false;
    }
    return true;
  });

  const setOrderDraft = (orderId: string, field: 'status' | 'tracking_carrier' | 'tracking_number', value: string) => {
    setOrderTrackingDraft((prev) => {
      const current = prev[orderId] ?? { status: 'pending', tracking_carrier: '', tracking_number: '' };
      return { ...prev, [orderId]: { ...current, [field]: value } };
    });
  };

  const handleUpdateOrderTracking = async (order: OrderRow) => {
    const draft = getOrderDraft(order);
    setUpdatingOrderId(order.id);
    const { error } = await supabase
      .from('orders')
      .update({
        status: draft.status || null,
        tracking_carrier: draft.tracking_carrier.trim() || null,
        tracking_number: draft.tracking_number.trim() || null,
      } as Record<string, unknown>)
      .eq('id', order.id);
    setUpdatingOrderId(null);
    if (error) {
      toast({ title: 'Failed to update order', description: error.message, variant: 'destructive' });
      return;
    }
    setAllOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: draft.status, tracking_carrier: draft.tracking_carrier.trim() || null, tracking_number: draft.tracking_number.trim() || null } as OrderRow
          : o
      )
    );
    setOrderTrackingDraft((prev) => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });
    toast({ title: 'Order updated', description: 'Status and tracking have been saved.' });
  };

  const handleToggleTrending = async (product: Product) => {
    setTogglingTrendingId(product.id);
    const next = !(product as Product & { is_trending?: boolean }).is_trending;
    const { error } = await supabase.from('products').update({ is_trending: next }).eq('id', product.id);
    setTogglingTrendingId(null);
    if (!error) {
      setAllProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_trending: next } : p)));
      toast({ title: next ? 'Product set as trending' : 'Product removed from trending' });
    } else toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
  };

  const handleApprove = async (shop: Shop) => {
    setApprovingId(shop.id);
    const { error } = await supabase.from('shops').update({ is_verified: true }).eq('id', shop.id);
    setApprovingId(null);
    if (!error) {
      setPendingShops((prev) => prev.filter((s) => s.id !== shop.id));
      setAllShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, is_verified: true } : s)));
      toast({ title: 'Shop approved', description: `${shop.name} is now live.` });
      const { success, error: emailError } = await sendTransactionalEmail({
        action: 'shop-approved',
        shop_id: shop.id,
      });
      if (!success && emailError) {
        toast({
          title: 'Approval email not sent',
          description: emailError,
          variant: 'destructive',
        });
      }
    } else toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
  };

  const deleteShopCascade = async (shopId: string): Promise<{ error: any }> => {
    try {
      // 1. Get product IDs
      const { data: shopProducts } = await supabase
        .from('products')
        .select('id')
        .eq('shop_id', shopId);
      const productIds = shopProducts?.map((p) => p.id) || [];

      // 2. Get order IDs
      const { data: shopOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('shop_id', shopId);
      const orderIds = shopOrders?.map((o) => o.id) || [];

      // 3. Get conversation IDs
      const { data: shopConvs } = await supabase
        .from('shop_conversations')
        .select('id')
        .eq('shop_id', shopId);
      const convIds = shopConvs?.map((c) => c.id) || [];

      // 4. Delete order items
      if (orderIds.length > 0) {
        const { error: err } = await supabase.from('order_items').delete().in('order_id', orderIds);
        if (err) return { error: err };
      }

      // 5. Delete orders
      const { error: orderErr } = await supabase.from('orders').delete().eq('shop_id', shopId);
      if (orderErr) return { error: orderErr };

      // 6. Delete shop messages
      if (convIds.length > 0) {
        const { error: msgErr } = await supabase.from('shop_messages').delete().in('conversation_id', convIds);
        if (msgErr) return { error: msgErr };
      }

      // 7. Delete conversations
      const { error: convErr } = await supabase.from('shop_conversations').delete().eq('shop_id', shopId);
      if (convErr) return { error: convErr };

      // 8. Delete shop followers
      const { error: folErr } = await supabase.from('shop_followers').delete().eq('shop_id', shopId);
      if (folErr) return { error: folErr };

      // 9. Delete product cart items, images, likes, engagement, saved_products, variants & options, reviews
      if (productIds.length > 0) {
        await supabase.from('cart_items').delete().in('product_id', productIds);
        await supabase.from('product_images').delete().in('product_id', productIds);
        await supabase.from('product_engagement').delete().in('product_id', productIds);
        await supabase.from('product_likes').delete().in('product_id', productIds);
        await supabase.from('saved_products').delete().in('product_id', productIds);

        // Variants and Options
        const { data: variants } = await supabase
          .from('product_variants')
          .select('id')
          .in('product_id', productIds);
        if (variants && variants.length > 0) {
          const variantIds = variants.map((v) => v.id);
          await supabase.from('variant_options').delete().in('variant_id', variantIds);
          await supabase.from('product_variants').delete().in('id', variantIds);
        }

        // Reviews and Review Images
        const { data: shopReviews } = await supabase
          .from('reviews')
          .select('id')
          .in('product_id', productIds);
        if (shopReviews && shopReviews.length > 0) {
          const reviewIds = shopReviews.map((r) => r.id);
          await supabase.from('review_images').delete().in('review_id', reviewIds);
          await supabase.from('reviews').delete().in('id', reviewIds);
        }
      }

      // 10. Delete products
      const { error: prodErr } = await supabase.from('products').delete().eq('shop_id', shopId);
      if (prodErr) return { error: prodErr };

      // 11. Delete the shop itself
      const { error: shopErr } = await supabase.from('shops').delete().eq('id', shopId);
      if (shopErr) return { error: shopErr };

      return { error: null };
    } catch (e) {
      return { error: e };
    }
  };

  const handleReject = async (shop: Shop) => {
    if (!confirm(`Are you sure you want to reject "${shop.name}"? This will remove the shop application.`)) return;
    setRejectingId(shop.id);
    const { error } = await deleteShopCascade(shop.id);
    setRejectingId(null);
    if (!error) {
      setPendingShops((prev) => prev.filter((s) => s.id !== shop.id));
      setAllShops((prev) => prev.filter((s) => s.id !== shop.id));
      toast({ title: 'Shop rejected', description: 'The shop application has been removed.' });
    } else toast({ title: 'Failed to reject', description: error.message || String(error), variant: 'destructive' });
  };

  const handleDeleteShop = async (shop: Shop) => {
    if (!confirm(`Are you sure you want to permanently delete "${shop.name}"? This cannot be undone.`)) return;
    setDeletingShopId(shop.id);
    const { error } = await deleteShopCascade(shop.id);
    setDeletingShopId(null);
    if (!error) {
      setAllShops((prev) => prev.filter((s) => s.id !== shop.id));
      setPendingShops((prev) => prev.filter((s) => s.id !== shop.id));
      toast({ title: 'Shop deleted', description: `${shop.name} has been removed.` });
    } else toast({ title: 'Failed to delete shop', description: error.message || String(error), variant: 'destructive' });
  };

  const handleSetAdmin = async (profile: ProfileRow, makeAdmin: boolean) => {
    const name = profile.full_name || profile.username || profile.id;
    const message = makeAdmin
      ? `Are you sure you want to make "${name}" an admin? They will have full access to the admin dashboard.`
      : `Are you sure you want to remove admin access from "${name}"? They will no longer be able to access the admin dashboard.`;
    if (!confirm(message)) return;
    setUpdatingRoleId(profile.id);
    const { error } = await supabase.rpc('set_user_role', {
      target_profile_id: profile.id,
      new_role: makeAdmin ? 'admin' : 'user',
    });
    setUpdatingRoleId(null);
    if (!error) {
      setUsers((prev) => prev.map((p) => (p.id === profile.id ? { ...p, role: makeAdmin ? 'admin' : 'user' } : p)));
      toast({ title: makeAdmin ? 'User is now an admin' : 'Admin role removed' });
    } else {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (profile: ProfileRow) => {
    const name = profile.full_name || profile.username || profile.id;
    if (!confirm(`Are you sure you want to permanently delete user "${name}"? They will be signed out and will not be able to sign in again. This cannot be undone.`)) return;
    setDeletingUserId(profile.id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: profile.id },
      });
      setDeletingUserId(null);
      if (error) throw new Error(error);
      const body = typeof data === 'string' ? JSON.parse(data || '{}') : data || {};
      if (body.error) throw new Error(body.error);
      setUsers((prev) => prev.filter((p) => p.id !== profile.id));
      toast({ title: 'User deleted', description: 'The user account has been removed.' });
    } catch (e) {
      setDeletingUserId(null);
      toast({ title: 'Failed to delete user', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleSendAdminPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const subject = adminPromoSubject.trim();
    const body = adminPromoBody.trim();
    if (!subject || !body) {
      toast({ title: 'Required', description: 'Please enter subject and message.', variant: 'destructive' });
      return;
    }
    setAdminPromoSending(true);
    try {
      const result = await sendTransactionalEmail({
        action: 'admin-promo-store-owners',
        subject,
        body,
        tier: adminPromoTier,
      });
      if (!result.success && result.error) throw new Error(result.error);
      toast({ title: 'Email sent', description: 'Promotional announcement sent to store owners.' });
      setAdminPromoSubject('');
      setAdminPromoBody('');
    } catch (err) {
      toast({ title: 'Could not send', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setAdminPromoSending(false);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inquiry? This cannot be undone.')) return;
    setDeletingInquiryId(id);
    const { error } = await supabase.from('contact_inquiries').delete().eq('id', id);
    setDeletingInquiryId(null);
    if (!error) {
      setInquiries((prev) => prev.filter((item) => item.id !== id));
      toast({ title: 'Inquiry deleted' });
    } else {
      toast({ title: 'Failed to delete inquiry', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleInquiryStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'unread' ? 'read' : 'unread';
    setUpdatingInquiryId(id);
    const { error } = await supabase
      .from('contact_inquiries')
      .update({ status: nextStatus })
      .eq('id', id);
    setUpdatingInquiryId(null);
    if (!error) {
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      );
      toast({ title: `Inquiry marked as ${nextStatus}` });
    } else {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    }
  };

  const handleTierChange = async (shopId: string, tier: string) => {
    setUpdatingTierShopId(shopId);
    const { error } = await supabase.from('shops').update({ pricing_tier: tier }).eq('id', shopId);
    setUpdatingTierShopId(null);
    if (!error) {
      setAllShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, pricing_tier: tier } : s)));
      toast({ title: 'Tier updated', description: 'Pricing tier saved.' });
    } else toast({ title: 'Failed to update tier', description: error.message, variant: 'destructive' });
  };

  const getEffectiveRole = (p: ProfileRow): 'admin' | 'seller' | 'customer' => {
    if (p.role === 'admin') return 'admin';
    if (allShops.some((s) => s.owner_id === p.id)) return 'seller';
    return 'customer';
  };

  const filteredUsers = useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    const dateFilter = userFilterDate;
    const now = Date.now();
    const cutoffs: Record<string, number> = {
      all: 0,
      '7': now - 7 * 24 * 60 * 60 * 1000,
      '30': now - 30 * 24 * 60 * 60 * 1000,
      '90': now - 90 * 24 * 60 * 60 * 1000,
    };
    const cutoff = cutoffs[dateFilter] ?? 0;

    let list = users.filter((p) => {
      if (q) {
        const name = (p.full_name ?? '').toLowerCase();
        const username = (p.username ?? '').toLowerCase();
        if (!name.includes(q) && !username.includes(q)) return false;
      }
      const role = getEffectiveRole(p);
      if (userFilterRole !== 'all' && role !== userFilterRole) return false;
      if (cutoff > 0 && p.created_at) {
        const created = new Date(p.created_at).getTime();
        if (created < cutoff) return false;
      }
      return true;
    });

    const roleOrder = { admin: 0, seller: 1, customer: 2 };
    list = [...list].sort((a, b) => {
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;
      const ra = getEffectiveRole(a);
      const rb = getEffectiveRole(b);
      if (ra !== rb) return roleOrder[ra] - roleOrder[rb];
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    return list;
  }, [users, allShops, user?.id, adminSearchQuery, userFilterRole, userFilterDate]);

  const shopSearchLower = adminSearchQuery.trim().toLowerCase();
  const filteredPendingShops = useMemo(() => {
    if (!shopSearchLower) return pendingShops;
    return pendingShops.filter((s) => {
      const name = (s.name ?? '').toLowerCase();
      const slug = (s.slug ?? '').toLowerCase();
      const owner = ownerByShopId[s.id];
      const ownerStr = owner ? [owner.full_name, owner.username].filter(Boolean).join(' ').toLowerCase() : '';
      return name.includes(shopSearchLower) || slug.includes(shopSearchLower) || ownerStr.includes(shopSearchLower);
    });
  }, [pendingShops, shopSearchLower, ownerByShopId]);

  const filteredAllShops = useMemo(() => {
    if (!shopSearchLower) return allShops;
    return allShops.filter((s) => {
      const name = (s.name ?? '').toLowerCase();
      const slug = (s.slug ?? '').toLowerCase();
      const owner = ownerByShopId[s.id];
      const ownerStr = owner ? [owner.full_name, owner.username].filter(Boolean).join(' ').toLowerCase() : '';
      return name.includes(shopSearchLower) || slug.includes(shopSearchLower) || ownerStr.includes(shopSearchLower);
    });
  }, [allShops, shopSearchLower, ownerByShopId]);

  const filteredProductsBySearch = useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter((p) => {
      const name = (p.name ?? '').toLowerCase();
      const shopName = (p.shops?.name ?? '').toLowerCase();
      return name.includes(q) || shopName.includes(q);
    });
  }, [allProducts, adminSearchQuery]);

  const filteredConversationsBySearch = useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    if (!q) return adminConversations;
    return adminConversations.filter((c) => {
      const shopName = (c.shops?.name ?? '').toLowerCase();
      const customerName = (adminCustomerNames[c.customer_id] ?? '').toLowerCase();
      return shopName.includes(q) || customerName.includes(q);
    });
  }, [adminConversations, adminSearchQuery, adminCustomerNames]);

  const filteredInquiries = useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter((item) => {
      const name = (item.name ?? '').toLowerCase();
      const email = (item.email ?? '').toLowerCase();
      const msg = (item.message ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || msg.includes(q);
    });
  }, [inquiries, adminSearchQuery]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (profileRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 flex flex-col items-center justify-center gap-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You don’t have permission to view this page. Only administrators can access the admin dashboard.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 sm:py-12 px-4 sm:px-6 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Admin dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage shops, users, and approvals.</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder={adminActiveTab === 'users' ? 'Search users by name or username...' : adminActiveTab === 'shops' ? 'Search shops...' : adminActiveTab === 'products' ? 'Search products...' : adminActiveTab === 'orders' ? 'Search orders...' : adminActiveTab === 'messages' ? 'Search conversations...' : adminActiveTab === 'inquiries' ? 'Search inquiries...' : 'Search...'}
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
 
          {/* Performance stats at a glance */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="rounded-md bg-amber-500/10 p-2">
                <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Pending shops</p>
                <p className="text-lg font-semibold tabular-nums">{shopsLoading ? '—' : pendingShops.length}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="rounded-md bg-blue-500/10 p-2">
                <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Shops</p>
                <p className="text-lg font-semibold tabular-nums">{shopsLoading ? '—' : allShops.length}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="rounded-md bg-emerald-500/10 p-2">
                <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Orders</p>
                <p className="text-lg font-semibold tabular-nums">{ordersLoading ? '—' : allOrders.length}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="rounded-md bg-violet-500/10 p-2">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Users</p>
                <p className="text-lg font-semibold tabular-nums">{usersLoading ? '—' : users.length}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="rounded-md bg-red-500/10 p-2">
                <Inbox className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Inquiries</p>
                <p className="text-lg font-semibold tabular-nums">
                  {inquiriesLoading ? '—' : inquiries.filter((i) => i.status === 'unread').length}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="rounded-md bg-green-500/10 p-2">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Revenue</p>
                <p className="text-lg font-semibold tabular-nums">
                  {ordersLoading ? '—' : `$${allOrders.reduce((sum, o) => sum + (Number((o as OrderRow & { total?: number }).total) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
            </div>
          </div>
        </div>
 
        <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto gap-1 p-1">
            <TabsTrigger value="shops" className="flex items-center gap-1.5 py-2">
              <Store className="h-4 w-4 shrink-0" />
              Shops
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1.5 py-2">
              <Package className="h-4 w-4 shrink-0" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1.5 py-2">
              <Truck className="h-4 w-4 shrink-0" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1.5 py-2">
              <MessageCircle className="h-4 w-4 shrink-0" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="flex items-center gap-1.5 py-2">
              <Inbox className="h-4 w-4 shrink-0" />
              Inquiries
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-1.5 py-2">
              <Mail className="h-4 w-4 shrink-0" />
              Promotions
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 py-2">
              <Users className="h-4 w-4 shrink-0" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shops" className="space-y-6">
        {/* Pending shops */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Pending shops ({filteredPendingShops.length}{filteredPendingShops.length !== pendingShops.length ? ` of ${pendingShops.length}` : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shopsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPendingShops.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{pendingShops.length === 0 ? 'No pending applications.' : 'No pending shops match the search.'}</p>
            ) : (
              <div className="space-y-4">
                {filteredPendingShops.map((shop) => (
                  <div
                    key={shop.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-border p-4"
                  >
                    <div className="flex-1 min-w-0 flex items-start gap-4">
                      {shop.logo ? (
                        <img src={shop.logo} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Store className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{shop.name}</p>
                        <p className="text-sm text-muted-foreground">/{shop.slug}</p>
                        {ownerByShopId[shop.id] && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Owner: {ownerByShopId[shop.id].full_name || ownerByShopId[shop.id].username || '—'}
                            {ownerByShopId[shop.id].username && (
                              <span className="ml-1">@{ownerByShopId[shop.id].username}</span>
                            )}
                          </p>
                        )}
                        {shop.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{shop.bio}</p>}
                        {shop.created_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Applied {new Date(shop.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button size="sm" onClick={() => handleApprove(shop)} disabled={approvingId === shop.id || rejectingId === shop.id} className="bg-green-600 hover:bg-green-700">
                        {approvingId === shop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Approve</>}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(shop)} disabled={approvingId === shop.id || rejectingId === shop.id}>
                        {rejectingId === shop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1" /> Reject</>}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" /> View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All shops */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              All shops ({filteredAllShops.length}{filteredAllShops.length !== allShops.length ? ` of ${allShops.length}` : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shopsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAllShops.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{allShops.length === 0 ? 'No shops yet.' : 'No shops match the search.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 font-medium">Name</th>
                      <th className="text-left py-3 font-medium">Slug</th>
                      <th className="text-left py-3 font-medium">Owner</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="text-left py-3 font-medium">Tier</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllShops.map((shop) => (
                      <tr key={shop.id} className="border-b border-border/50">
                        <td className="py-3">{shop.name}</td>
                        <td className="py-3 text-muted-foreground">/{shop.slug}</td>
                        <td className="py-3 text-muted-foreground">
                          {ownerByShopId[shop.id]
                            ? [ownerByShopId[shop.id].full_name, ownerByShopId[shop.id].username && `@${ownerByShopId[shop.id].username}`].filter(Boolean).join(' ') || '—'
                            : '—'}
                        </td>
                        <td className="py-3">
                          <span className={shop.is_verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                            {shop.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3">
                          <Select
                            value={(shop as Shop & { pricing_tier?: string }).pricing_tier ?? 'starter'}
                            onValueChange={(v) => handleTierChange(shop.id, v)}
                            disabled={updatingTierShopId === shop.id}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="growth">Growth</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer">View</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteShop(shop)}
                              disabled={deletingShopId === shop.id}
                            >
                              {deletingShopId === shop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" /> Delete</>}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="products" className="space-y-6">
        {/* Trending Products */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Products ({filteredProductsBySearch.filter((p) => (p as Product & { is_trending?: boolean }).is_trending).length} selected{filteredProductsBySearch.length !== allProducts.length ? ` · ${filteredProductsBySearch.length} of ${allProducts.length} shown` : ''})
            </CardTitle>
            <p className="text-sm text-muted-foreground">Toggle which products appear in the Trending section on the home page.</p>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProductsBySearch.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{allProducts.length === 0 ? 'No products yet.' : 'No products match the search.'}</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 font-medium">Product</th>
                      <th className="text-left py-3 font-medium">Shop</th>
                      <th className="text-left py-3 font-medium">Price</th>
                      <th className="text-right py-3 font-medium">Trending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProductsBySearch.map((product) => (
                      <tr key={product.id} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {product.product_images?.[0]?.image_url ? (
                              <img src={product.product_images[0].image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-secondary shrink-0" />
                            )}
                            <span className="font-medium truncate max-w-[180px]">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">{product.shops?.name ?? '—'}</td>
                        <td className="py-3">${product.price.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant={(product as Product & { is_trending?: boolean }).is_trending ? 'default' : 'outline'}
                            onClick={() => handleToggleTrending(product)}
                            disabled={togglingTrendingId === product.id}
                            className="gap-1"
                          >
                            {togglingTrendingId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                            {(product as Product & { is_trending?: boolean }).is_trending ? 'Trending' : 'Add'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manage products: add/remove products for any shop */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage products
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add or remove products for any shop. Select a shop below, then add products or delete existing ones.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:max-w-xs space-y-2">
                <Label>Shop</Label>
                <Select value={manageProductsShopId ?? '__none__'} onValueChange={(v) => setManageProductsShopId(v === '__none__' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select a shop</SelectItem>
                    {allShops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} / {s.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {manageProductsShopId && (
                <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add product</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddProductForShop} className="space-y-4">
                      {addProductError && (
                        <p className="text-sm text-destructive">{addProductError}</p>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="admin-product-name">Name</Label>
                        <Input
                          id="admin-product-name"
                          value={addProductName}
                          onChange={(e) => setAddProductName(e.target.value)}
                          placeholder="Product name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-product-price">Price ($)</Label>
                        <Input
                          id="admin-product-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={addProductPrice}
                          onChange={(e) => setAddProductPrice(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-product-desc">Description (optional)</Label>
                        <Input
                          id="admin-product-desc"
                          value={addProductDescription}
                          onChange={(e) => setAddProductDescription(e.target.value)}
                          placeholder="Short description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-product-image">Image</Label>
                        <Input
                          id="admin-product-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAddProductImageFile(e.target.files?.[0] ?? null)}
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setAddProductOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addingProduct}>
                          {addingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add product'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {manageProductsShopId && (
              <>
                {productsForShopLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : productsForShop.length === 0 ? (
                  <p className="text-muted-foreground py-4">No products in this shop yet. Add one above.</p>
                ) : (
                  <div className="border rounded-lg divide-y divide-border max-h-[320px] overflow-y-auto">
                    {productsForShop.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-4 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {p.product_images?.[0]?.image_url ? (
                            <img src={p.product_images[0].image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-sm text-muted-foreground">${Number(p.price).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/product/${p.slug}`} target="_blank" rel="noopener noreferrer">
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProduct(p)}
                            disabled={deletingProductId === p.id}
                          >
                            {deletingProductId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
        {/* Order management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Order management ({filteredOrders.length}{filteredOrders.length !== allOrders.length ? ` of ${allOrders.length}` : ''})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              View all orders, filter by status or shop, update status and tracking. Expand a row to see full details.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap text-xs">Status</Label>
                <Select value={orderFilterStatus || '__all__'} onValueChange={(v) => setOrderFilterStatus(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap text-xs">Shop</Label>
                <Select value={orderFilterShopId || '__all__'} onValueChange={(v) => setOrderFilterShopId(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="All shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All shops</SelectItem>
                    {allShops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap text-xs">Type</Label>
                <Select value={orderFilterType || '__all__'} onValueChange={(v) => setOrderFilterType(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    <SelectItem value="purchase">Product purchases</SelectItem>
                    <SelectItem value="upgrade">Plan upgrades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                {allOrders.length === 0 ? 'No orders yet.' : 'No orders match the current filters.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-3 font-medium w-8"></th>
                      <th className="text-left py-3 font-medium">Order</th>
                      <th className="text-left py-3 font-medium">Date</th>
                      <th className="text-left py-3 font-medium">Shop</th>
                      <th className="text-left py-3 font-medium">Customer</th>
                      <th className="text-right py-3 font-medium">Total</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="text-left py-3 font-medium">Tracking</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const draft = getOrderDraft(order);
                      const shopName = order.shops?.name ?? '—';
                      const customerName = order.customer_name || order.customer_email || `#${order.user_id.slice(0, 8)}`;
                      const isExpanded = expandedOrderId === order.id;
                      const o = order as OrderRow & { tracking_carrier?: string | null; tracking_number?: string | null; customer_phone?: string | null; shipping_address?: string | null; shipping_city?: string | null; shipping_state?: string | null; shipping_zip_code?: string | null; shipping_country?: string | null; shipping_method?: string | null };
                      return (
                        <React.Fragment key={order.id}>
                          <tr className="border-b border-border/50">
                            <td className="py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              >
                                <span className="text-muted-foreground">{isExpanded ? '−' : '+'}</span>
                              </Button>
                            </td>
                             <td className="py-2 font-mono text-xs">
                              <div className="flex flex-col gap-1">
                                <span>{order.order_number ?? order.id.slice(0, 8)}</span>
                                {order.shipping_method?.startsWith('plan_upgrade:') && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 w-fit capitalize">
                                    Upgrade: {order.shipping_method.split(':')[1]}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 text-muted-foreground whitespace-nowrap">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2">{shopName}</td>
                            <td className="py-2 max-w-[120px] truncate" title={customerName}>{customerName}</td>
                            <td className="py-2 text-right font-medium">${Number(order.total).toFixed(2)}</td>
                            <td className="py-2">
                              {order.shipping_method?.startsWith('plan_upgrade:') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  Completed
                                </span>
                              ) : (
                                <select
                                  value={draft.status}
                                  onChange={(e) => setOrderDraft(order.id, 'status', e.target.value)}
                                  className="h-8 rounded-md border border-input bg-background px-2 text-xs w-full max-w-[100px]"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              )}
                            </td>
                            <td className="py-2">
                              {order.shipping_method?.startsWith('plan_upgrade:') ? (
                                <span className="text-xs text-muted-foreground italic">
                                  Virtual Product
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1 max-w-[180px]">
                                  <input
                                    type="text"
                                    placeholder="Carrier"
                                    value={draft.tracking_carrier}
                                    onChange={(e) => setOrderDraft(order.id, 'tracking_carrier', e.target.value)}
                                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Tracking number"
                                    value={draft.tracking_number}
                                    onChange={(e) => setOrderDraft(order.id, 'tracking_number', e.target.value)}
                                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {order.shipping_method?.startsWith('plan_upgrade:') ? (
                                <span className="text-xs text-muted-foreground">
                                  Auto-managed
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateOrderTracking(order)}
                                  disabled={updatingOrderId === order.id}
                                >
                                  {updatingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                                </Button>
                              )}
                            </td>
                            </tr>
                          {isExpanded && (
                            <tr className="border-b border-border/50 bg-muted/30">
                              <td colSpan={9} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1">Customer & contact</p>
                                    <p className="font-medium">{o.customer_name || '—'}</p>
                                    {o.customer_email && <p><a href={`mailto:${o.customer_email}`} className="text-primary hover:underline">{o.customer_email}</a></p>}
                                    {o.customer_phone && <p><a href={`tel:${o.customer_phone}`} className="text-primary hover:underline">{o.customer_phone}</a></p>}
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1">Shipping</p>
                                    <p>{(o.shipping_address || o.shipping_city) ? [o.shipping_address, [o.shipping_city, o.shipping_state, o.shipping_zip_code].filter(Boolean).join(', '), o.shipping_country].filter(Boolean).join(', ') : '—'}</p>
                                    {o.shipping_method && <p className="capitalize text-muted-foreground">Method: {o.shipping_method.replace(/-/g, ' ')}</p>}
                                  </div>
                                </div>
                                {order.shipping_method?.startsWith('plan_upgrade:') ? (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="font-medium text-muted-foreground mb-2">Upgrade details</p>
                                    <div className="flex justify-between text-sm">
                                      <span className="capitalize font-medium text-purple-600 dark:text-purple-400">
                                        Tenga {order.shipping_method.split(':')[1]} Plan Subscription Upgrade
                                      </span>
                                      <span>${Number(order.total).toFixed(2)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  order.order_items && order.order_items.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <p className="font-medium text-muted-foreground mb-2">Items</p>
                                      <ul className="space-y-1">
                                        {order.order_items.map((oi) => (
                                          <li key={oi.id} className="flex justify-between">
                                            <span>{oi.products?.name ?? 'Product'} × {oi.quantity}</span>
                                            <span>${Number(oi.price * oi.quantity).toFixed(2)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
        {/* Messages (customer–seller) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages ({filteredConversationsBySearch.length}{filteredConversationsBySearch.length !== adminConversations.length ? ` of ${adminConversations.length}` : ''})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              View conversations between customers and sellers. Select a thread to read messages.
            </p>
          </CardHeader>
          <CardContent>
            {adminConversationsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversationsBySearch.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{adminConversations.length === 0 ? 'No conversations yet.' : 'No conversations match the search.'}</p>
            ) : (
              <div className="flex flex-col md:flex-row gap-4">
                <ul className="space-y-1 border-r border-border pr-4 min-w-[220px] max-h-[320px] overflow-y-auto">
                  {filteredConversationsBySearch.map((c) => {
                    const shopName = c.shops?.name ?? 'Shop';
                    const customerName = adminCustomerNames[c.customer_id] ?? 'Customer';
                    const label = `${shopName} · ${customerName}`;
                    return (
                      <li key={c.id}>
                        <Button
                          variant={adminSelectedConvId === c.id ? 'secondary' : 'ghost'}
                          className="w-full justify-start text-left text-sm h-auto py-2"
                          onClick={() => setAdminSelectedConvId(c.id)}
                        >
                          <span className="truncate">{label}</span>
                          {c.updated_at && (
                            <span className="text-xs text-muted-foreground ml-1 shrink-0">
                              {new Date(c.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex-1 flex flex-col min-h-[280px]">
                  {!adminSelectedConvId ? (
                    <p className="text-muted-foreground text-center py-8">Select a conversation</p>
                  ) : adminConvMessagesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[320px] pr-2">
                      {adminConvMessages.map((m) => {
                        const conv = adminConversations.find((c) => c.id === adminSelectedConvId);
                        const isCustomer = conv && m.sender_id === conv.customer_id;
                        const senderLabel = isCustomer
                          ? (adminCustomerNames[m.sender_id] ?? 'Customer')
                          : (conv ? (allShops.find((s) => s.id === conv.shop_id)?.name ?? 'Shop') : 'Seller');
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              'flex flex-col',
                              isCustomer ? 'items-start' : 'items-end'
                            )}
                          >
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">{senderLabel}</p>
                            <div
                              className={cn(
                                'rounded-2xl px-4 py-2 text-sm max-w-[85%]',
                                isCustomer ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              {m.created_at && (
                                <p className={cn('text-xs mt-1', isCustomer ? 'text-muted-foreground' : 'text-primary-foreground/80')}>
                                  {new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="inquiries" className="space-y-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Contact Inquiries ({filteredInquiries.length}{filteredInquiries.length !== inquiries.length ? ` of ${inquiries.length}` : ''})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  View and manage messages received from visitors via the Contact Us form.
                </p>
              </CardHeader>
              <CardContent>
                {inquiriesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredInquiries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    {inquiries.length === 0 ? 'No inquiries received yet.' : 'No inquiries match the search.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredInquiries.map((inquiry) => (
                      <div
                        key={inquiry.id}
                        className={cn(
                          "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
                          inquiry.status === 'unread' 
                            ? "border-l-4 border-l-primary bg-primary/5 border-border" 
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base">{inquiry.name}</h3>
                            <a
                              href={`mailto:${inquiry.email}`}
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              {inquiry.email}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {inquiry.created_at ? new Date(inquiry.created_at).toLocaleString() : '—'}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                                inquiry.status === 'unread'
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                              )}
                            >
                              {inquiry.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed bg-background/50 p-3 rounded-md border border-border/50">
                          {inquiry.message}
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={`mailto:${inquiry.email}?subject=Re: Tenga Support Inquiry`}>
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Reply
                            </a>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleInquiryStatus(inquiry.id, inquiry.status)}
                            disabled={updatingInquiryId === inquiry.id}
                          >
                            {updatingInquiryId === inquiry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : inquiry.status === 'unread' ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                Mark Read
                              </>
                            ) : (
                              <>
                                <Inbox className="h-3.5 w-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                                Mark Unread
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteInquiry(inquiry.id)}
                            disabled={deletingInquiryId === inquiry.id}
                          >
                            {deletingInquiryId === inquiry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
        {/* Email store owners (promo by pricing tier) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email store owners
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Send a promotional or announcement email to shop owners. Optionally target by pricing tier (Starter, Growth, Enterprise).
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendAdminPromo} className="space-y-4 max-w-xl">
              <div>
                <Label htmlFor="admin-promo-subject">Subject *</Label>
                <Input
                  id="admin-promo-subject"
                  value={adminPromoSubject}
                  onChange={(e) => setAdminPromoSubject(e.target.value)}
                  placeholder="e.g. New features for sellers"
                  className="mt-1"
                  disabled={adminPromoSending}
                />
              </div>
              <div>
                <Label htmlFor="admin-promo-body">Message *</Label>
                <Textarea
                  id="admin-promo-body"
                  value={adminPromoBody}
                  onChange={(e) => setAdminPromoBody(e.target.value)}
                  placeholder="Write your message. Plain text or simple HTML."
                  rows={6}
                  className="mt-1"
                  disabled={adminPromoSending}
                />
              </div>
              <div>
                <Label htmlFor="admin-promo-tier">Send to</Label>
                <Select value={adminPromoTier} onValueChange={setAdminPromoTier} disabled={adminPromoSending}>
                  <SelectTrigger id="admin-promo-tier" className="mt-1 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All store owners</SelectItem>
                    <SelectItem value="starter">Starter tier only</SelectItem>
                    <SelectItem value="growth">Growth tier only</SelectItem>
                    <SelectItem value="enterprise">Enterprise tier only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={adminPromoSending}>
                {adminPromoSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send email to store owners
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="users" className="space-y-6">
        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length}{filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
            </CardTitle>
            <p className="text-sm text-muted-foreground">Make users admins or remove accounts. Logged-in admin first, then admins, sellers, customers.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap text-xs">Role</Label>
                <Select value={userFilterRole} onValueChange={setUserFilterRole}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap text-xs">Joined</Label>
                <Select value={userFilterDate} onValueChange={setUserFilterDate}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No users yet.</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No users match the search or filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 font-medium">Name</th>
                      <th className="text-left py-3 font-medium">Username</th>
                      <th className="text-left py-3 font-medium">Role</th>
                      <th className="text-left py-3 font-medium">Joined</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((p) => {
                      const displayRole = getEffectiveRole(p);
                      const displayRoleLabel = displayRole === 'admin' ? 'Admin' : displayRole === 'seller' ? 'Seller' : 'Customer';
                      return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-3">{p.full_name || '—'}</td>
                        <td className="py-3 text-muted-foreground">@{p.username ?? '—'}</td>
                        <td className="py-3">
                          {displayRoleLabel === 'Admin' && (
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                              <Shield className="h-4 w-4" /> Admin
                            </span>
                          )}
                          {displayRoleLabel === 'Seller' && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Store className="h-4 w-4" /> Seller
                            </span>
                          )}
                          {displayRoleLabel === 'Customer' && (
                            <span className="text-muted-foreground">Customer</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {p.id !== user.id && (
                              <>
                                {p.role === 'admin' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetAdmin(p, false)}
                                    disabled={updatingRoleId === p.id}
                                  >
                                    {updatingRoleId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove admin'}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetAdmin(p, true)}
                                    disabled={updatingRoleId === p.id}
                                  >
                                    {updatingRoleId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4 mr-1" /> Make admin</>}
                                  </Button>
                                )}
                                {p.role !== 'admin' && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteUser(p)}
                                    disabled={deletingUserId === p.id}
                                  >
                                    {deletingUserId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" /> Delete user</>}
                                  </Button>
                                )}
                              </>
                            )}
                            {p.id === user.id && <span className="text-muted-foreground text-xs">(you)</span>}
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboardPage;
