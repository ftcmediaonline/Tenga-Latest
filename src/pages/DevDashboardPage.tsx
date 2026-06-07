import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Code2,
  Loader2,
  ShieldAlert,
  Database,
  ExternalLink,
  Server,
  Link2,
  Layers,
  Shield,
  UserPlus,
  UserMinus,
  Store,
  Package,
  Compass,
  Star,
  Mail,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';

type TableStat = { table: string; count: number };
type DevProfile = { id: string; full_name: string | null; username: string | null; is_dev: boolean };
type DiscoverShop = { id: string; name: string; slug: string; is_on_discover: boolean };
type DiscoverProduct = { id: string; name: string; slug: string; shop_id: string; shop_name: string; is_on_discover: boolean };
type FeaturedShop = { id: string; name: string; slug: string; is_featured: boolean };

const DevDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [devProfiles, setDevProfiles] = useState<DevProfile[]>([]);
  const [devProfilesLoading, setDevProfilesLoading] = useState(true);
  const [updatingDevId, setUpdatingDevId] = useState<string | null>(null);
  const [discoverShops, setDiscoverShops] = useState<DiscoverShop[]>([]);
  const [discoverProducts, setDiscoverProducts] = useState<DiscoverProduct[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [togglingShopId, setTogglingShopId] = useState<string | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [featuredShops, setFeaturedShops] = useState<FeaturedShop[]>([]);
  const [featuredShopsLoading, setFeaturedShopsLoading] = useState(true);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState<string>('');
  const [savingShopName, setSavingShopName] = useState(false);
  const { toast } = useToast();
  const [sandboxEmails, setSandboxEmails] = useState<any[]>([]);

  useEffect(() => {
    if (isDev) {
      const emails = JSON.parse(localStorage.getItem('tenga_sent_emails') || '[]');
      setSandboxEmails(emails);
    }
  }, [isDev]);

  const handleClearEmails = () => {
    localStorage.removeItem('tenga_sent_emails');
    setSandboxEmails([]);
    toast({ title: 'Sandbox cleared', description: 'All simulated email logs have been removed.' });
  };

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
      let data: { role: string | null; is_dev: boolean | null } | null = null;
      const byId = await supabase.from('profiles').select('role, is_dev').eq('id', user.id).maybeSingle();
      data = byId.data;
      if (data == null) {
        const byUserId = await supabase.from('profiles').select('role, is_dev').eq('user_id', user.id).maybeSingle();
        data = byUserId.data;
      }
      setProfileRole(data?.role ?? null);
      setIsDev(data?.is_dev === true);
      setProfileLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!isDev) return;
    (async () => {
      const tables = [
        'profiles',
        'shops',
        'products',
        'product_images',
        'product_likes',
        'product_engagement',
        'categories',
        'cart_items',
        'orders',
        'order_items',
        'reviews',
        'shop_followers',
      ] as const;
      const results: TableStat[] = [];
      for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number') {
          results.push({ table, count });
        }
      }
      setTableStats(results);
      setStatsLoading(false);
    })();
  }, [isDev]);

  useEffect(() => {
    if (!isDev) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_profiles_for_dev');
      if (!error && data) setDevProfiles(data as DevProfile[]);
      setDevProfilesLoading(false);
    })();
  }, [isDev]);

  useEffect(() => {
    if (!isDev) return;
    (async () => {
      const { data: shopRows } = await supabase
        .from('shops')
        .select('id, name, slug, is_on_discover')
        .eq('is_verified', true)
        .order('name');
      const shops: DiscoverShop[] = (shopRows ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        is_on_discover: (s as { is_on_discover?: boolean }).is_on_discover === true,
      }));
      setDiscoverShops(shops);
      const shopIds = shops.map((s) => s.id);
      if (shopIds.length === 0) {
        setDiscoverProducts([]);
        setDiscoverLoading(false);
        return;
      }
      const { data: productRows } = await supabase
        .from('products')
        .select('id, name, slug, shop_id, is_on_discover, shops(name)')
        .in('shop_id', shopIds)
        .order('name');
      const products: DiscoverProduct[] = (productRows ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        shop_id: p.shop_id,
        shop_name: (p as { shops?: { name: string } }).shops?.name ?? '—',
        is_on_discover: (p as { is_on_discover?: boolean }).is_on_discover === true,
      }));
      setDiscoverProducts(products);
      setDiscoverLoading(false);
    })();
  }, [isDev]);

  useEffect(() => {
    if (!isDev) return;
    (async () => {
      const { data: shopRows } = await supabase
        .from('shops')
        .select('id, name, slug, is_featured')
        .eq('is_verified', true)
        .order('name');
      const shops: FeaturedShop[] = (shopRows ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        is_featured: (s as { is_featured?: boolean }).is_featured === true,
      }));
      setFeaturedShops(shops);
      setFeaturedShopsLoading(false);
    })();
  }, [isDev]);

  const handleSetShopDiscover = async (shopId: string, onDiscover: boolean) => {
    setTogglingShopId(shopId);
    const { error } = await supabase.rpc('set_shop_on_discover', { p_shop_id: shopId, p_on_discover: onDiscover });
    setTogglingShopId(null);
    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      return;
    }
    setDiscoverShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, is_on_discover: onDiscover } : s)));
    toast({ title: onDiscover ? 'Shop added to Discover' : 'Shop removed from Discover' });
  };

  const handleSetProductDiscover = async (productId: string, onDiscover: boolean) => {
    setTogglingProductId(productId);
    const { error } = await supabase.rpc('set_product_on_discover', { p_product_id: productId, p_on_discover: onDiscover });
    setTogglingProductId(null);
    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      return;
    }
    setDiscoverProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, is_on_discover: onDiscover } : p)));
    toast({ title: onDiscover ? 'Product added to Discover' : 'Product removed from Discover' });
  };

  const handleToggleFeatured = async (shop: FeaturedShop) => {
    setTogglingFeaturedId(shop.id);
    const next = !shop.is_featured;
    const { error } = await supabase.rpc('set_shop_featured', { p_shop_id: shop.id, p_featured: next });
    setTogglingFeaturedId(null);
    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      return;
    }
    setFeaturedShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, is_featured: next } : s)));
    toast({ title: next ? 'Shop featured' : 'Shop unfeatured' });
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingShopId(id);
    setEditingShopName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingShopId(null);
    setEditingShopName('');
  };

  const handleSaveShopName = async (shopId: string) => {
    if (!editingShopName.trim()) {
      toast({ title: 'Invalid name', description: 'Shop name cannot be empty.', variant: 'destructive' });
      return;
    }
    setSavingShopName(true);
    const { error } = await supabase.rpc('set_shop_name', { p_shop_id: shopId, p_name: editingShopName.trim() });
    setSavingShopName(false);
    if (error) {
      toast({ title: 'Failed to update shop name', description: error.message, variant: 'destructive' });
      return;
    }

    setDiscoverShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, name: editingShopName.trim() } : s)));
    setFeaturedShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, name: editingShopName.trim() } : s)));
    setDiscoverProducts((prev) =>
      prev.map((p) => (p.shop_id === shopId ? { ...p, shop_name: editingShopName.trim() } : p))
    );

    setEditingShopId(null);
    setEditingShopName('');
    toast({ title: 'Shop name updated successfully' });
  };

  const handleSetDev = async (profile: DevProfile, makeDev: boolean) => {
    const name = profile.full_name || profile.username || profile.id;
    const firstMessage = makeDev
      ? `Grant ${name} access to the dev panel? They will be able to see database stats and dev tools.`
      : `Remove dev panel access from ${name}? They will no longer see the dev panel.`;
    const secondMessage = makeDev
      ? 'Are you sure? This will give them access to the dev panel.'
      : 'Are you sure? This will remove their dev panel access.';

    if (!window.confirm(firstMessage)) return;
    if (!window.confirm(secondMessage)) return;

    setUpdatingDevId(profile.id);
    const { error } = await supabase.rpc('set_user_dev', {
      target_profile_id: profile.id,
      new_is_dev: makeDev,
    });
    setUpdatingDevId(null);
    if (error) {
      toast({ title: 'Failed to update dev access', description: error.message, variant: 'destructive' });
      return;
    }
    setDevProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, is_dev: makeDev } : p))
    );
    toast({ title: makeDev ? 'Dev access granted' : 'Dev access removed' });
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\./)?.[1] ?? null;
  const supabaseDashboardLink = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : 'https://supabase.com/dashboard';

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

  if (!isDev) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 flex flex-col items-center justify-center gap-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You don’t have permission to view this page. Only users with the <strong>dev</strong> role can access the dev panel.
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
      <main className="flex-1 container py-8 sm:py-12 px-4 sm:px-6 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Code2 className="h-8 w-8" />
            Dev panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Database stats, environment info, and quick links for development.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 py-2">
              <Server className="h-4 w-4 shrink-0" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-1.5 py-2">
              <Compass className="h-4 w-4 shrink-0" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-1.5 py-2">
              <Star className="h-4 w-4 shrink-0" />
              Featured
            </TabsTrigger>
            <TabsTrigger value="dev-access" className="flex items-center gap-1.5 py-2">
              <UserPlus className="h-4 w-4 shrink-0" />
              Dev access
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-1.5 py-2">
              <Database className="h-4 w-4 shrink-0" />
              Database
            </TabsTrigger>
            <TabsTrigger value="email-sandbox" className="flex items-center gap-1.5 py-2">
              <Mail className="h-4 w-4 shrink-0" />
              Email Sandbox
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        {/* Environment & links */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Mode:</span>
              <span className="text-sm font-medium">
                {import.meta.env.DEV ? 'Development' : 'Production'}
              </span>
            </div>
            {supabaseUrl && (
              <div className="flex flex-wrap items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate max-w-full">
                  {supabaseUrl}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" asChild>
                <a href={supabaseDashboardLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Supabase Dashboard
                </a>
              </Button>
              {profileRole === 'admin' && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin dashboard
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="discover" className="space-y-6">
        {/* Discover page curation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              Discover page
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Control which shops and products appear on the <strong>/discover</strong> page. Enable a shop to show all its products, or enable individual products.
            </p>
            <Button size="sm" variant="outline" className="w-fit" asChild>
              <Link to="/discover" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Discover page
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Store className="h-4 w-4" />
                Shops on Discover ({discoverShops.filter((s) => s.is_on_discover).length} of {discoverShops.length})
              </h4>
              {discoverLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : discoverShops.length === 0 ? (
                <p className="text-sm text-muted-foreground">No verified shops yet.</p>
              ) : (
                <div className="border rounded-lg divide-y divide-border max-h-[240px] overflow-y-auto">
                  {discoverShops.map((s) => (
                    <div key={s.id} className="group flex items-center justify-between gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        {editingShopId === s.id ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <Input
                              type="text"
                              value={editingShopName}
                              onChange={(e) => setEditingShopName(e.target.value)}
                              className="h-8 py-1 px-2 text-sm max-w-[200px]"
                              disabled={savingShopName}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveShopName(s.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              onClick={() => handleSaveShopName(s.id)}
                              disabled={savingShopName}
                            >
                              {savingShopName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={handleCancelEdit}
                              disabled={savingShopName}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">/{s.slug}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              onClick={() => handleStartEdit(s.id, s.name)}
                              title="Edit shop name"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={s.is_on_discover ? 'default' : 'outline'}
                        onClick={() => handleSetShopDiscover(s.id, !s.is_on_discover)}
                        disabled={togglingShopId === s.id || editingShopId === s.id}
                      >
                        {togglingShopId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : s.is_on_discover ? 'On Discover' : 'Add to Discover'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                Products on Discover ({discoverProducts.filter((p) => p.is_on_discover).length} of {discoverProducts.length})
              </h4>
              {discoverLoading ? null : discoverProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products from verified shops.</p>
              ) : (
                <div className="border rounded-lg divide-y divide-border max-h-[280px] overflow-y-auto">
                  {discoverProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.shop_name} · /{p.slug}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={p.is_on_discover ? 'default' : 'outline'}
                        onClick={() => handleSetProductDiscover(p.id, !p.is_on_discover)}
                        disabled={togglingProductId === p.id}
                      >
                        {togglingProductId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : p.is_on_discover ? 'On Discover' : 'Add to Discover'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
        {/* Featured shops (home page) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Featured shops
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Control which verified shops appear in the <strong>Featured Shops</strong> section on the home page.
            </p>
            <Button size="sm" variant="outline" className="w-fit" asChild>
              <Link to="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                View home page
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              Shops ({featuredShops.filter((s) => s.is_featured).length} featured of {featuredShops.length})
            </h4>
            {featuredShopsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : featuredShops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No verified shops yet.</p>
            ) : (
              <div className="border rounded-lg divide-y divide-border max-h-[320px] overflow-y-auto">
                {featuredShops.map((s) => (
                  <div key={s.id} className="group flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      {editingShopId === s.id ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <Input
                            type="text"
                            value={editingShopName}
                            onChange={(e) => setEditingShopName(e.target.value)}
                            className="h-8 py-1 px-2 text-sm max-w-[200px]"
                            disabled={savingShopName}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveShopName(s.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            onClick={() => handleSaveShopName(s.id)}
                            disabled={savingShopName}
                          >
                            {savingShopName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={handleCancelEdit}
                            disabled={savingShopName}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">/{s.slug}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            onClick={() => handleStartEdit(s.id, s.name)}
                            title="Edit shop name"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={s.is_featured ? 'default' : 'outline'}
                      onClick={() => handleToggleFeatured(s)}
                      disabled={togglingFeaturedId === s.id || editingShopId === s.id}
                      className="gap-1"
                    >
                      {togglingFeaturedId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className={`h-3.5 w-3.5 ${s.is_featured ? 'fill-current' : ''}`} />}
                      {s.is_featured ? 'Featured' : 'Feature'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="dev-access" className="space-y-6">
        {/* Dev access management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Dev access
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Grant or revoke dev panel access for other users. You will be asked to confirm twice before making changes.
            </p>
          </CardHeader>
          <CardContent>
            {devProfilesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : devProfiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No profiles found.</p>
            ) : (
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b border-border">
                    <tr>
                      <th className="text-left py-3 font-medium">Name</th>
                      <th className="text-left py-3 font-medium">Username</th>
                      <th className="text-left py-3 font-medium">Dev access</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devProfiles.map((p) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-3">{p.full_name || '—'}</td>
                        <td className="py-3 text-muted-foreground">@{p.username ?? '—'}</td>
                        <td className="py-3">
                          {p.is_dev ? (
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                              <Code2 className="h-4 w-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {p.id !== user.id && (
                            p.is_dev ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetDev(p, false)}
                                disabled={updatingDevId === p.id}
                              >
                                {updatingDevId === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><UserMinus className="h-4 w-4 mr-1" /> Remove dev</>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetDev(p, true)}
                                disabled={updatingDevId === p.id}
                              >
                                {updatingDevId === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><UserPlus className="h-4 w-4 mr-1" /> Make dev</>
                                )}
                              </Button>
                            )
                          )}
                          {p.id === user.id && (
                            <span className="text-muted-foreground text-xs">(you)</span>
                          )}
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

          <TabsContent value="database" className="space-y-6">
        {/* Database table stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Table row counts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Live counts from the connected Supabase project.
            </p>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tableStats.map(({ table, count }) => (
                  <div
                    key={table}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <span className="text-sm font-medium font-mono">{table}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="email-sandbox" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Transactional Email Sandbox
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visual simulator logs for local verification and mock transactional email flows.
                  </p>
                </div>
                {sandboxEmails.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleClearEmails}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Clear Logs
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {sandboxEmails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg border-muted bg-muted/20">
                    <Mail className="h-12 w-12 text-muted-foreground mb-3 opacity-60" />
                    <h3 className="font-semibold text-lg">No simulated emails yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                      Complete a checkout, register a new shop, or broadcast an email campaign to populate sandbox logs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sandboxEmails.map((email: any) => (
                      <div
                        key={email.id}
                        className="p-4 border rounded-lg border-border bg-card/50 flex flex-col gap-2.5 transition-all hover:bg-card"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                              {email.action.replace('-', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(email.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-destructive bg-destructive/5 px-2 py-0.5 rounded border border-destructive/10">
                            Fallback trigger: Local Sandbox ({email.error?.slice(0, 30)}...)
                          </span>
                        </div>

                        <div className="text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                            {email.email && (
                              <div>
                                <strong className="text-muted-foreground">Recipient Email:</strong> {email.email}
                              </div>
                            )}
                            {email.customerName && (
                              <div>
                                <strong className="text-muted-foreground">Customer:</strong> {email.customerName}
                              </div>
                            )}
                            {email.shopName && (
                              <div>
                                <strong className="text-muted-foreground">Shop Name:</strong> {email.shopName}
                              </div>
                            )}
                            {email.orderNumber && (
                              <div>
                                <strong className="text-muted-foreground">Order #:</strong> {email.orderNumber}
                              </div>
                            )}
                            {email.total !== undefined && (
                              <div>
                                <strong className="text-muted-foreground">Total Paid:</strong> ${email.total.toFixed(2)}
                              </div>
                            )}
                            {email.subject && (
                              <div className="sm:col-span-2">
                                <strong className="text-muted-foreground">Subject:</strong> {email.subject}
                              </div>
                            )}
                          </div>

                          {email.items && email.items.length > 0 && (
                            <div className="mt-3 border rounded-lg overflow-hidden bg-muted/30">
                              <table className="w-full text-[11px] text-left border-collapse">
                                <thead>
                                  <tr className="bg-muted text-muted-foreground border-b border-border">
                                    <th className="px-3 py-1.5 font-medium">Item Name</th>
                                    <th className="px-3 py-1.5 font-medium text-center">Qty</th>
                                    <th className="px-3 py-1.5 font-medium text-right">Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {email.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-border last:border-0">
                                      <td className="px-3 py-1.5 font-medium">{item.name}</td>
                                      <td className="px-3 py-1.5 text-center">{item.qty}</td>
                                      <td className="px-3 py-1.5 text-right">${item.price.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {email.body && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border text-xs max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                              {email.body}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* About - outside tabs, always visible at bottom */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Use the <strong>Admin</strong> dashboard to approve shops, manage users, and toggle
              trending. Use the <strong>Featured</strong> tab above to control which shops appear on the home page.
            </p>
            <p>
              Run migrations from the Supabase Dashboard or CLI to keep the database schema in sync.
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DevDashboardPage;
