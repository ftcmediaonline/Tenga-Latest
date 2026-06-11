import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/utils/emailService';
import { PaymentStatusBadge } from '@/components/orders/PaymentStatusBadge';
import type { Tables } from '@/integrations/supabase/types';
import {
  Package,
  Plus,
  Star,
  MessageSquare,
  Loader2,
  Store,
  ShoppingCart,
  Send,
  Mail,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

type Shop = Tables<'shops'>;
type Product = Tables<'products'>;
type ProductWithVariants = Tables<'products'> & {
  product_variants?: (Tables<'product_variants'> & {
    variant_options?: Tables<'variant_options'>[];
  })[];
};
type Review = Tables<'reviews'> & { products?: { name: string } | null };
type OrderRow = Tables<'orders'> & {
  order_items?: (Tables<'order_items'> & { products?: { name: string } | null })[];
  tracking_carrier?: string | null;
  tracking_number?: string | null;
};

type CustomerProfile = { id: string; full_name: string | null; username: string };

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const SellerDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addSizes, setAddSizes] = useState('');
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  
  const [sizesOpen, setSizesOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [manageSizesText, setManageSizesText] = useState('');
  const [savingSizes, setSavingSizes] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [customerByUserId, setCustomerByUserId] = useState<Record<string, CustomerProfile>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; customer_id: string; updated_at: string | null }[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<{ id: string; sender_id: string; content: string; created_at: string | null }[]>([]);
  const [convMessagesLoading, setConvMessagesLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [customerNames, setCustomerNames] = useState<Record<string, { full_name: string | null; username: string | null }>>({});
  const [customerAvatars, setCustomerAvatars] = useState<Record<string, string | null>>({});
  const [sellerProfile, setSellerProfile] = useState<{ full_name: string | null; username: string | null; avatar_url: string | null } | null>(null);
  const [shipDialogOrderId, setShipDialogOrderId] = useState<string | null>(null);
  const [shipCarrier, setShipCarrier] = useState('');
  const [shipTrackingNumber, setShipTrackingNumber] = useState('');
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [promoSubject, setPromoSubject] = useState('');
  const [promoBody, setPromoBody] = useState('');
  const [promoAudience, setPromoAudience] = useState<string[]>(['followers']);
  const [promoSending, setPromoSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleMarkDelivered = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' } : o))
    );
    setUpdatingOrderId(null);
  };

  const openShipDialog = (order: OrderRow) => {
    setShipDialogOrderId(order.id);
    setShipCarrier((order as OrderRow).tracking_carrier ?? '');
    setShipTrackingNumber((order as OrderRow).tracking_number ?? '');
  };

  const handleMarkShipped = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipDialogOrderId) return;
    const carrier = shipCarrier.trim();
    const tracking = shipTrackingNumber.trim();
    if (!carrier || !tracking) {
      toast({ title: 'Required', description: 'Please enter carrier and tracking number.', variant: 'destructive' });
      return;
    }
    setShippingOrderId(shipDialogOrderId);
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_carrier: carrier,
        tracking_number: tracking,
      } as Record<string, unknown>)
      .eq('id', shipDialogOrderId);
    setShippingOrderId(null);
    setShipDialogOrderId(null);
    setShipCarrier('');
    setShipTrackingNumber('');
    if (error) {
      toast({ title: 'Could not update order', description: error.message, variant: 'destructive' });
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === shipDialogOrderId
          ? { ...o, status: 'shipped', tracking_carrier: carrier, tracking_number: tracking } as OrderRow
          : o
      )
    );
    toast({ title: 'Order marked as shipped', description: 'Carrier and tracking are saved. They will appear in the admin dashboard.' });
  };

  const handleSendPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !user) return;
    const subject = promoSubject.trim();
    const body = promoBody.trim();
    if (!subject || !body) {
      toast({ title: 'Required', description: 'Please enter subject and message.', variant: 'destructive' });
      return;
    }
    if (promoAudience.length === 0) {
      toast({ title: 'Audience', description: 'Select at least one audience: Followers and/or Past customers.', variant: 'destructive' });
      return;
    }
    setPromoSending(true);
    try {
      const result = await sendTransactionalEmail({
        action: 'promotional-email',
        shop_id: shop.id,
        subject,
        body,
        audience: promoAudience,
      });
      if (!result.success && result.error) throw new Error(result.error);
      toast({ title: 'Promotional email sent', description: 'Your email campaign has been broadcasted.' });
      setPromoSubject('');
      setPromoBody('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Could not send', description: message, variant: 'destructive' });
    } finally {
      setPromoSending(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setShopLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      setShop(data ?? null);
      setShopLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!shop) return;
    setProductsLoading(true);
    supabase
      .from('products')
      .select('*, product_variants(id, name, type, variant_options(id, value))')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts((data as any) ?? []);
        setProductsLoading(false);
      });
  }, [shop]);


  useEffect(() => {
    if (!shop) return;
    setConversationsLoading(true);
    supabase
      .from('shop_conversations')
      .select('id, customer_id, updated_at')
      .eq('shop_id', shop.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setConversations((data ?? []) as { id: string; customer_id: string; updated_at: string | null }[]);
        setConversationsLoading(false);
        const customerIds = [...new Set((data ?? []).map((c) => c.customer_id).filter(Boolean))];
        if (customerIds.length > 0) {
          supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', customerIds)
            .then(({ data: profiles }) => {
              const map: Record<string, { full_name: string | null; username: string | null }> = {};
              const avatars: Record<string, string | null> = {};
              (profiles ?? []).forEach((p: { id: string; full_name: string | null; username: string | null; avatar_url?: string | null }) => {
                map[p.id] = { full_name: p.full_name, username: p.username };
                avatars[p.id] = p.avatar_url ?? null;
              });
              setCustomerNames(map);
              setCustomerAvatars(avatars);
            });
        }
      });
  }, [shop]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const byId = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', user.id).maybeSingle();
      if (byId.data) {
        setSellerProfile({ full_name: byId.data.full_name, username: byId.data.username, avatar_url: byId.data.avatar_url ?? null });
      } else {
        const byUserId = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', user.id).maybeSingle();
        if (byUserId.data) setSellerProfile({ full_name: byUserId.data.full_name, username: byUserId.data.username, avatar_url: byUserId.data.avatar_url ?? null });
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedConvId) {
      setConvMessages([]);
      return;
    }
    setConvMessagesLoading(true);
    supabase
      .from('shop_messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', selectedConvId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setConvMessages((data ?? []) as { id: string; sender_id: string; content: string; created_at: string | null }[]);
        setConvMessagesLoading(false);
      });
  }, [selectedConvId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConvId || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from('shop_messages').insert({
        conversation_id: selectedConvId,
        sender_id: user.id,
        content: messageDraft.trim(),
      });
      if (error) throw error;
      setMessageDraft('');
      const { data } = await supabase
        .from('shop_messages')
        .select('id, sender_id, content, created_at')
        .eq('conversation_id', selectedConvId)
        .order('created_at', { ascending: true });
      setConvMessages((data ?? []) as { id: string; sender_id: string; content: string; created_at: string | null }[]);
    } catch (e) {
      toast({ title: 'Could not send message', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (!shop) return;
    setReviewsLoading(true);
    supabase
      .from('products')
      .select('id')
      .eq('shop_id', shop.id)
      .then(({ data: prods }) => {
        const ids = (prods ?? []).map((p) => p.id);
        if (ids.length === 0) {
          setReviews([]);
          setReviewsLoading(false);
          return;
        }
        supabase
          .from('reviews')
          .select('*, products(name)')
          .in('product_id', ids)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setReviews((data ?? []) as Review[]);
            setReviewsLoading(false);
          });
      });
  }, [shop]);

  useEffect(() => {
    if (!shop) return;
    setOrdersLoading(true);
    supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as OrderRow[];
        setOrders(list);
        setOrdersLoading(false);
        const userIds = [...new Set(list.map((o) => o.user_id).filter(Boolean))];
        if (userIds.length === 0) {
          setCustomerByUserId({});
          return;
        }
        supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds)
          .then(({ data: profiles }) => {
            const map: Record<string, CustomerProfile> = {};
            (profiles ?? []).forEach((p: { id: string; full_name: string | null; username: string }) => {
              map[p.id] = { id: p.id, full_name: p.full_name ?? null, username: p.username ?? '—' };
            });
            setCustomerByUserId(map);
          });
      });
  }, [shop]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !user) return;
    setAddError(null);
    const name = addName.trim();
    const price = parseFloat(addPrice);
    if (!name || isNaN(price) || price < 0) {
      setAddError('Name and a valid price are required.');
      return;
    }
    if (!addImageFile) {
      setAddError('Please add a product image.');
      return;
    }
    setAdding(true);
    try {
      const slug = slugFromName(name) || 'product-' + Date.now();
      const { data: product, error: insertErr } = await supabase
        .from('products')
        .insert({
          shop_id: shop.id,
          name,
          slug,
          price,
          description: addDescription.trim() || null,
          in_stock: true,
          stock_count: null,
          rating: null,
          review_count: null,
          like_count: null,
        })
        .select('id')
        .single();
      if (insertErr) {
        setAddError(insertErr.message);
        setAdding(false);
        return;
      }
      const ext = addImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `products/${shop.id}/${product.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('shop-assets')
        .upload(path, addImageFile, { cacheControl: '3600', upsert: false });
      if (uploadErr) {
        setAddError('Product created but image upload failed: ' + uploadErr.message);
        setAdding(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(path);
      await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: urlData.publicUrl,
      });

      // Insert sizes if any are provided
      const sizeList = addSizes.split(',').map(s => s.trim()).filter(Boolean);
      if (sizeList.length > 0) {
        const { data: variant, error: varErr } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            name: 'Size',
            type: 'size',
          })
          .select('id')
          .single();

        if (varErr) {
          console.warn('[Add Product] Size variant insert failed:', varErr);
        } else if (variant) {
          const optionsToInsert = sizeList.map(val => ({
            variant_id: variant.id,
            value: val,
          }));
          await supabase.from('variant_options').insert(optionsToInsert);
        }
      }

      const { data: updated } = await supabase
        .from('products')
        .select('*, product_variants(id, name, type, variant_options(id, value))')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
      setProducts((updated as any) ?? []);
      setAddOpen(false);
      setAddName('');
      setAddPrice('');
      setAddDescription('');
      setAddSizes('');
      addImageFile && setAddImageFile(null);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setAdding(false);
  };

  const openManageSizes = (p: ProductWithVariants) => {
    setSelectedProduct(p);
    const sizeVar = p.product_variants?.find(v => v.type === 'size');
    const existingSizes = sizeVar?.variant_options?.map(o => o.value).join(', ') || '';
    setManageSizesText(existingSizes);
    setSizesOpen(true);
  };

  const handleSaveSizes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !shop) return;
    setSavingSizes(true);
    const sizesStr = manageSizesText.trim();
    const sizeList = sizesStr.split(',').map(s => s.trim()).filter(Boolean);

    try {
      // 1. Delete existing size variants and their options safely
      const { data: existingVars } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', selectedProduct.id)
        .eq('type', 'size');

      if (existingVars && existingVars.length > 0) {
        const varIds = existingVars.map(v => v.id);
        await supabase.from('variant_options').delete().in('variant_id', varIds);
        await supabase.from('product_variants').delete().in('id', varIds);
      }

      // 2. Insert new size variants if any are provided
      if (sizeList.length > 0) {
        const { data: variant, error: varErr } = await supabase
          .from('product_variants')
          .insert({
            product_id: selectedProduct.id,
            name: 'Size',
            type: 'size',
          })
          .select('id')
          .single();

        if (varErr) throw varErr;

        if (variant) {
          const optionsToInsert = sizeList.map(val => ({
            variant_id: variant.id,
            value: val,
          }));
          const { error: optErr } = await supabase.from('variant_options').insert(optionsToInsert);
          if (optErr) throw optErr;
        }
      }

      // 3. Refresh products state
      const { data: updated } = await supabase
        .from('products')
        .select('*, product_variants(id, name, type, variant_options(id, value))')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
      setProducts((updated as any) ?? []);

      toast({
        title: 'Sizes updated',
        description: `Sizes for "${selectedProduct.name}" have been updated successfully.`,
      });
      setSizesOpen(false);
      setSelectedProduct(null);
      setManageSizesText('');
    } catch (err) {
      toast({
        title: 'Error updating sizes',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSavingSizes(false);
    }
  };

  const handleReply = async (reviewId: string) => {
    const text = replyDraft[reviewId]?.trim();
    if (!text) return;
    setReplyingId(reviewId);
    const { data, error } = await supabase
      .from('reviews')
      .update({ owner_reply: text, owner_replied_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select('id')
      .single();
    setReplyingId(null);
    setEditingReplyId(null);
    if (error) {
      toast({
        title: 'Could not save reply',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    if (!data) {
      toast({
        title: 'Could not save reply',
        description: 'You may not have permission to reply to this review.',
        variant: 'destructive',
      });
      return;
    }
    setReplyDraft((prev) => ({ ...prev, [reviewId]: '' }));
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, owner_reply: text, owner_replied_at: new Date().toISOString() }
          : r
      )
    );
    toast({ title: 'Reply saved', description: 'Your reply has been published.' });
  };

  const startEditReply = (r: Review) => {
    setEditingReplyId(r.id);
    setReplyDraft((prev) => ({ ...prev, [r.id]: r.owner_reply ?? '' }));
  };

  if (authLoading || shopLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-8 sm:py-12 px-4 sm:px-6 text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No shop yet</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Open a shop to start selling and managing products and reviews.
          </p>
          <Button asChild>
            <Link to="/open-shop">Open a shop</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 sm:py-12 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl font-bold">{shop.name}</h1>
            <p className="text-muted-foreground mt-1">Manage your products and reply to reviews.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/shop/${shop.slug}`}>
                <Store className="h-4 w-4 mr-1" />
                View shop
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto justify-start sm:grid sm:grid-cols-5 h-auto p-1 gap-1 hide-scrollbar max-w-3xl bg-muted">
            <TabsTrigger value="products" className="flex items-center gap-2 shrink-0">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 shrink-0">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2 shrink-0">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2 shrink-0">
              <Star className="h-4 w-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-2 shrink-0">
              <Mail className="h-4 w-4" />
              Promotions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your products</CardTitle>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add product</DialogTitle>
                      <DialogDescription>
                        Add a new product listing to your shop.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                      {addError && (
                        <p className="text-sm text-destructive">{addError}</p>
                      )}
                      <div>
                        <Label htmlFor="name">Product name *</Label>
                        <Input
                          id="name"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          placeholder="e.g. Blue Running Shoes"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={addPrice}
                          onChange={(e) => setAddPrice(e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={addDescription}
                          onChange={(e) => setAddDescription(e.target.value)}
                          placeholder="Describe your product..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addSizes">Sizes (optional, comma-separated)</Label>
                        <Input
                          id="addSizes"
                          value={addSizes}
                          onChange={(e) => setAddSizes(e.target.value)}
                          placeholder="e.g. S, M, L, XL or 38, 39, 40"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Product image *</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAddImageFile(e.target.files?.[0] ?? null)}
                          />
                          {addImageFile && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {addImageFile.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={adding}>
                          {adding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Add product'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    No products yet. Add your first product to start selling.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {products.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-medium truncate">{p.name}</p>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 items-center mt-0.5">
                            <span>${Number(p.price).toFixed(2)}</span>
                            {p.description && (
                              <span className="truncate max-w-[200px] sm:max-w-md">
                                · {p.description.slice(0, 50)}{p.description.length > 50 ? '…' : ''}
                              </span>
                            )}
                            {p.product_variants && p.product_variants.length > 0 && p.product_variants.map(v => {
                              const opts = v.variant_options?.map(o => o.value).join(', ');
                              return opts ? (
                                <span key={v.id} className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground border border-border">
                                  {v.name}: {opts}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openManageSizes(p)}>
                            Sizes
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/product/${p.slug}`} target="_blank" rel="noopener noreferrer">
                              View
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Orders from customers for your store.
                </p>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    No orders yet. Orders will appear here when customers buy your products.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {orders.map((order) => {
                      const customer = order.user_id ? customerByUserId[order.user_id] : null;
                      const status = order.status ?? 'pending';
                      const isPending = status === 'pending' || status === 'processing';
                      const isShipped = status === 'shipped';
                      const orderWithTracking = order as OrderRow & { tracking_carrier?: string | null; tracking_number?: string | null };
                      return (
                        <li
                          key={order.id}
                          className="rounded-lg border border-border p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {order.order_number ?? `#${order.id.slice(0, 8)}`}
                            </span>
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
                                    : order.status === 'shipped'
                                      ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                      : 'bg-primary/20 text-primary'
                              )}
                            >
                              {order.status ?? 'pending'}
                            </span>
                          </div>
                          <PaymentStatusBadge
                            paymentStatus={order.payment_status}
                            paymentMethod={order.payment_method}
                          />
                          {(orderWithTracking.tracking_carrier || orderWithTracking.tracking_number) && (
                            <p className="text-xs text-muted-foreground">
                              {orderWithTracking.tracking_carrier && <span>Carrier: {orderWithTracking.tracking_carrier}</span>}
                              {orderWithTracking.tracking_carrier && orderWithTracking.tracking_number && ' · '}
                              {orderWithTracking.tracking_number && <span>Tracking: {orderWithTracking.tracking_number}</span>}
                            </p>
                          )}
                          {/* Customer & shipping details (from checkout form) */}
                          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                            <p className="font-medium text-muted-foreground">Customer & shipping</p>
                            {(order.customer_name ?? order.customer_email) ? (
                              <>
                                <p className="text-foreground font-medium">
                                  {order.customer_name || customer?.full_name || (customer ? `@${customer.username}` : null) || '—'}
                                  {customer && !order.customer_name && (
                                    <span className="text-muted-foreground font-normal"> (@{customer.username})</span>
                                  )}
                                </p>
                                {order.customer_email && (
                                  <p className="text-foreground">
                                    <a href={`mailto:${order.customer_email}`} className="text-primary hover:underline">
                                      {order.customer_email}
                                    </a>
                                  </p>
                                )}
                                {order.customer_phone && (
                                  <p className="text-foreground">
                                    <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">
                                      {order.customer_phone}
                                    </a>
                                  </p>
                                )}
                                {(order.shipping_address || order.shipping_city) && (
                                  <p className="text-muted-foreground">
                                    {[order.shipping_address, [order.shipping_city, order.shipping_state, order.shipping_zip_code].filter(Boolean).join(', '), order.shipping_country].filter(Boolean).join(', ')}
                                  </p>
                                )}
                                {order.shipping_method && (
                                  <p className="text-muted-foreground capitalize">
                                    Shipping: {order.shipping_method.replace(/-/g, ' ')}
                                  </p>
                                )}
                              </>
                            ) : customer ? (
                              <p className="text-foreground">
                                {customer.full_name || 'No name'}{' '}
                                <span className="text-muted-foreground">(@{customer.username})</span>
                              </p>
                            ) : (
                              <p className="text-muted-foreground">No contact details</p>
                            )}
                          </div>
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
                          {isPending && (
                            <Dialog open={shipDialogOrderId === order.id} onOpenChange={(open) => !open && setShipDialogOrderId(null)}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                disabled={shippingOrderId === order.id}
                                onClick={() => openShipDialog(order)}
                              >
                                {shippingOrderId === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Mark as shipped'
                                )}
                              </Button>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Mark order as shipped</DialogTitle>
                                  <DialogDescription>
                                    Enter the carrier and tracking number. This will be visible to the customer and in the admin dashboard.
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleMarkShipped} className="space-y-4 mt-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="ship-carrier">Carrier *</Label>
                                    <Input
                                      id="ship-carrier"
                                      list="carrier-suggestions"
                                      placeholder="e.g. DHL, FedEx, UPS, USPS"
                                      value={shipCarrier}
                                      onChange={(e) => setShipCarrier(e.target.value)}
                                      required
                                    />
                                    <datalist id="carrier-suggestions">
                                      <option value="DHL" />
                                      <option value="FedEx" />
                                      <option value="UPS" />
                                      <option value="USPS" />
                                      <option value="Aramex" />
                                    </datalist>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="ship-tracking">Tracking number *</Label>
                                    <Input
                                      id="ship-tracking"
                                      placeholder="Tracking or waybill number"
                                      value={shipTrackingNumber}
                                      onChange={(e) => setShipTrackingNumber(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShipDialogOrderId(null)}>
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={shippingOrderId === order.id}>
                                      {shippingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as shipped'}
                                    </Button>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                          {isShipped && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              disabled={updatingOrderId === order.id}
                              onClick={() => handleMarkDelivered(order.id)}
                            >
                              {updatingOrderId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Mark as delivered'
                              )}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Conversations with customers who messaged you from your shop page.
                </p>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    No messages yet. Customers can start a conversation from your shop page.
                  </p>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4">
                    <ul className="space-y-1 border-r border-border pr-4 min-w-[200px]">
                      {conversations.map((c) => {
                        const name = customerNames[c.customer_id];
                        const label = name?.full_name || name?.username || 'Customer';
                        const avatarUrl = customerAvatars[c.customer_id];
                        const initials = name?.full_name
                          ? name.full_name.trim().split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
                          : name?.username?.slice(0, 2).toUpperCase() ?? '?';
                        return (
                          <li key={c.id}>
                            <Button
                              variant={selectedConvId === c.id ? 'secondary' : 'ghost'}
                              className="w-full justify-start text-left gap-2"
                              onClick={() => setSelectedConvId(c.id)}
                            >
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={avatarUrl ?? undefined} alt={label} />
                                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                              </Avatar>
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
                    <div className="flex-1 flex flex-col min-h-[300px]">
                      {!selectedConvId ? (
                        <p className="text-muted-foreground text-center py-8">Select a conversation</p>
                      ) : convMessagesLoading ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 overflow-y-auto space-y-3 py-2">
                            {convMessages.map((m) => {
                              const isMe = m.sender_id === user?.id;
                              const otherName = customerNames[m.sender_id];
                              const name = isMe
                                ? (shop?.name ?? 'Store')
                                : (otherName?.full_name || otherName?.username || 'Customer');
                              const avatarUrl = isMe ? sellerProfile?.avatar_url : customerAvatars[m.sender_id];
                              const getInitials = (fn: string | null, un: string | null) => {
                                if (fn?.trim()) {
                                  const parts = fn.trim().split(/\s+/);
                                  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
                                }
                                return un?.slice(0, 2).toUpperCase() ?? '?';
                              };
                              const initials = isMe
                                ? (shop?.name?.trim().slice(0, 2).toUpperCase() ?? 'ST')
                                : getInitials(otherName?.full_name ?? null, otherName?.username ?? null);
                              return (
                                <div
                                  key={m.id}
                                  className={cn(
                                    'flex gap-2',
                                    isMe ? 'flex-row-reverse' : 'flex-row'
                                  )}
                                >
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className={cn('flex flex-col min-w-0 max-w-[85%]', isMe ? 'items-end' : 'items-start')}>
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">{name}</p>
                                    <div
                                      className={cn(
                                        'rounded-2xl px-4 py-2 text-sm',
                                        isMe
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-foreground'
                                      )}
                                    >
                                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                      {m.created_at && (
                                        <p className="text-xs mt-1 opacity-80">
                                          {new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-border">
                            <Input
                              value={messageDraft}
                              onChange={(e) => setMessageDraft(e.target.value)}
                              placeholder="Type a reply..."
                              className="flex-1"
                              disabled={sendingMessage}
                              maxLength={2000}
                            />
                            <Button type="submit" size="icon" disabled={sendingMessage || !messageDraft.trim()}>
                              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer reviews</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reply to reviews for your products.
                </p>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    No reviews yet. Reviews will appear here when customers leave them on your products.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-border p-4 space-y-2"
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {r.products?.name ?? 'Product'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            {r.rating ?? '—'}
                          </span>
                          <span>·</span>
                          <span>
                            {r.created_at
                              ? new Date(r.created_at).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        <p className="text-foreground">{r.comment || 'No comment'}</p>
                        {r.owner_reply && editingReplyId !== r.id ? (
                          <div className="rounded-md bg-muted/50 p-3 text-sm">
                            <p className="font-medium text-muted-foreground mb-1">Your reply</p>
                            <p>{r.owner_reply}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8 text-xs"
                              onClick={() => startEditReply(r)}
                            >
                              Edit reply
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label htmlFor={`reply-${r.id}`} className="sr-only">
                                Reply
                              </Label>
                              <Textarea
                                id={`reply-${r.id}`}
                                placeholder="Write a reply..."
                                value={replyDraft[r.id] ?? ''}
                                onChange={(e) =>
                                  setReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))
                                }
                                rows={2}
                                className="resize-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              {editingReplyId === r.id && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingReplyId(null);
                                    setReplyDraft((prev) => ({ ...prev, [r.id]: '' }));
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleReply(r.id)}
                                disabled={!replyDraft[r.id]?.trim() || replyingId === r.id}
                              >
                                {replyingId === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : r.owner_reply ? (
                                  'Update reply'
                                ) : (
                                  'Reply'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="promotions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Promotional email</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Send a one-time email to your followers and/or past customers. Use for announcements, offers, or news.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendPromo} className="space-y-4 max-w-xl">
                  <div>
                    <Label htmlFor="promo-subject">Subject *</Label>
                    <Input
                      id="promo-subject"
                      value={promoSubject}
                      onChange={(e) => setPromoSubject(e.target.value)}
                      placeholder="e.g. 20% off this weekend"
                      className="mt-1"
                      disabled={promoSending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo-body">Message *</Label>
                    <Textarea
                      id="promo-body"
                      value={promoBody}
                      onChange={(e) => setPromoBody(e.target.value)}
                      placeholder="Write your message. You can use plain text or simple HTML."
                      rows={6}
                      className="mt-1"
                      disabled={promoSending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Send to</Label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={promoAudience.includes('followers')}
                          onCheckedChange={(checked) => {
                            setPromoAudience((prev) =>
                              checked ? [...prev.filter((a) => a !== 'followers'), 'followers'] : prev.filter((a) => a !== 'followers')
                            );
                          }}
                          disabled={promoSending}
                        />
                        <span className="text-sm">Followers</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={promoAudience.includes('customers')}
                          onCheckedChange={(checked) => {
                            setPromoAudience((prev) =>
                              checked ? [...prev.filter((a) => a !== 'customers'), 'customers'] : prev.filter((a) => a !== 'customers')
                            );
                          }}
                          disabled={promoSending}
                        />
                        <span className="text-sm">Past customers</span>
                      </label>
                    </div>
                  </div>
                  <Button type="submit" disabled={promoSending || promoAudience.length === 0}>
                    {promoSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Send promotional email
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={sizesOpen} onOpenChange={setSizesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage product sizes</DialogTitle>
              <DialogDescription>
                Configure the available sizes for "{selectedProduct?.name}". Enter sizes as a comma-separated list.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveSizes} className="space-y-4">
              <div>
                <Label htmlFor="manageSizes">Available Sizes (comma-separated)</Label>
                <Input
                  id="manageSizes"
                  value={manageSizesText}
                  onChange={(e) => setManageSizesText(e.target.value)}
                  placeholder="e.g. S, M, L, XL or 38, 39, 40, 41"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to remove all sizes for this product.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSizesOpen(false);
                    setSelectedProduct(null);
                    setManageSizesText('');
                  }}
                  disabled={savingSizes}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSizes}>
                  {savingSizes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save sizes'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default SellerDashboardPage;
