import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, ImagePlus, Tags, FileCheck, ChevronLeft, ChevronRight,
  Check, Upload, Sparkles, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import { fetchCategories } from '@/data/categories';
import type { Category } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/utils/emailService';

const STEPS = [
  { id: 'details', label: 'Shop Details', icon: Store },
  { id: 'branding', label: 'Branding', icon: ImagePlus },
  { id: 'category', label: 'Category', icon: Tags },
  { id: 'review', label: 'Review & Submit', icon: FileCheck },
];

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const OpenShopPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [shopName, setShopName] = useState('');
  const [shopBio, setShopBio] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const handleImagePreview = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void,
    setFile: (f: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setter(null);
      setFile(null);
    }
  };

  const getExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
  };

  const uploadShopImage = async (
    file: File,
    userId: string,
    type: 'logo' | 'banner'
  ): Promise<{ url: string } | { error: string }> => {
    const ext = getExtension(file.name);
    const path = `shops/${userId}/${Date.now()}-${type}.${ext}`;
    const { error } = await supabase.storage.from('shop-assets').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) return { error: error.message };
    const { data } = supabase.storage.from('shop-assets').getPublicUrl(path);
    return { url: data.publicUrl };
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return shopName.trim() && shopBio.trim() && location.trim() && email.trim();
      case 1:
        return !!logoFile && !!bannerFile; // logo and banner required
      case 2:
        return !!selectedCategory;
      case 3:
        return agreedToTerms;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setSubmitError('Please sign in to open a shop.');
      navigate('/auth');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Resolve category_id: match by slug from mock data first (DB may use slug), then by name
      const categorySlug = categories.find((c) => c.name === selectedCategory)?.slug;
      let categoryId: string | null = null;
      if (categorySlug) {
        const { data: bySlug } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle();
        categoryId = bySlug?.id ?? null;
      }
      if (!categoryId) {
        const { data: byName } = await supabase
          .from('categories')
          .select('id')
          .eq('name', selectedCategory)
          .maybeSingle();
        categoryId = byName?.id ?? null;
      }

      const slug = slugFromName(shopName);
      if (!slug) {
        setSubmitError('Shop name must contain at least one letter or number.');
        setSubmitting(false);
        return;
      }

      // Upload logo and banner to storage if user selected files; don't create shop unless uploads succeed
      let logoUrl: string | null = null;
      let bannerUrl: string | null = null;
      if (logoFile) {
        const result = await uploadShopImage(logoFile, user.id, 'logo');
        if ('error' in result) {
          setSubmitError(`Failed to upload logo: ${result.error}`);
          setSubmitting(false);
          return;
        }
        logoUrl = result.url;
      }
      if (bannerFile) {
        const result = await uploadShopImage(bannerFile, user.id, 'banner');
        if ('error' in result) {
          setSubmitError(`Failed to upload banner: ${result.error}`);
          setSubmitting(false);
          return;
        }
        bannerUrl = result.url;
      }

      const { error } = await supabase.from('shops').insert({
        owner_id: user.id,
        name: shopName.trim(),
        slug,
        bio: shopBio.trim() || null,
        location: location.trim() || null,
        category_id: categoryId,
        logo: logoUrl,
        banner: bannerUrl,
        is_verified: false,
        rating: null,
        review_count: null,
        follower_count: null,
        product_count: null,
        contact_email: email.trim() || null,
        contact_phone: phone.trim() || null,
      });

      if (error) {
        setSubmitError(error.message || 'Failed to create shop. Please try again.');
        setSubmitting(false);
        return;
      }

      // Send confirmation email via Edge Function (Resend)
      await sendTransactionalEmail({
        action: 'shop-confirmation',
        email: email.trim(),
        shopName: shopName.trim(),
      });

      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <CartDrawer />
        <div className="container max-w-lg py-12 sm:py-20 px-4 sm:px-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10"
          >
            <Sparkles className="h-10 w-10 text-success" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold"
          >
            Your shop is being set up!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-muted-foreground"
          >
            We'll review <strong>{shopName}</strong> and notify you at <strong>{email}</strong> once it's live. This usually takes less than 24 hours.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Button asChild className="bg-gradient-primary">
              <Link to="/">Back to Home</Link>
            </Button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      <div className="container max-w-2xl py-6 sm:py-8 md:py-12 px-4 sm:px-6">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">Open Your Shop</h1>
          <p className="mt-2 text-muted-foreground">
            Start selling on Tenga in just a few steps
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isDone
                      ? 'border-success bg-success text-success-foreground'
                      : isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`hidden h-0.5 w-8 md:block ${
                      isDone ? 'bg-success' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step label */}
        <p className="mb-6 text-center text-sm font-medium text-primary">
          Step {currentStep + 1}: {STEPS[currentStep].label}
        </p>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-6 md:p-8"
          >
            {currentStep === 0 && (
              <div className="space-y-5">
                <div>
                  <Label htmlFor="shopName">Shop Name *</Label>
                  <Input
                    id="shopName"
                    placeholder="e.g. Urban Threads"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    maxLength={60}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Shop Description *</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell customers what makes your shop special..."
                    value={shopBio}
                    onChange={(e) => setShopBio(e.target.value)}
                    maxLength={300}
                    rows={3}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{shopBio.length}/300</p>
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Harare, Zimbabwe"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+263 77 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Logo */}
                <div>
                  <Label>Shop Logo *</Label>
                  <p className="text-xs text-muted-foreground mb-2">Required. Square image recommended (min 200×200px)</p>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 p-6 transition-colors hover:border-primary/50 hover:bg-secondary">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="h-24 w-24 rounded-xl object-cover" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload logo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImagePreview(e, setLogoPreview, setLogoFile)}
                    />
                  </label>
                </div>

                {/* Banner */}
                <div>
                  <Label>Shop Banner *</Label>
                  <p className="text-xs text-muted-foreground mb-2">Required. Wide image recommended (min 1200×400px)</p>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 p-8 transition-colors hover:border-primary/50 hover:bg-secondary">
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Banner preview" className="h-32 w-full rounded-lg object-cover" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload banner</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImagePreview(e, setBannerPreview, setBannerFile)}
                    />
                  </label>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">Select the category that best describes your shop</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        selectedCategory === cat.name
                          ? 'border-primary bg-accent'
                          : 'border-border hover:border-primary/30 hover:bg-secondary'
                      }`}
                    >
                      <Icon className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                {!user && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Please sign in to submit your shop application.</span>
                  </div>
                )}
                {submitError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold">Review your shop</h3>

                {/* Preview card */}
                <div className="rounded-xl border border-border overflow-hidden">
                  {bannerPreview && (
                    <img src={bannerPreview} alt="Banner" className="h-24 w-full object-cover" />
                  )}
                  <div className="p-4 flex items-start gap-4">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-xl object-cover border-2 border-background shadow" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-2xl">
                        <Store className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{shopName || 'Shop Name'}</p>
                      <p className="text-sm text-muted-foreground">{location}</p>
                      <span className="mt-1 inline-block text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {selectedCategory}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">{shopBio}</p>
                  </div>
                </div>

                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong className="text-foreground">Email:</strong> {email}</p>
                  {phone && <p><strong className="text-foreground">Phone:</strong> {phone}</p>}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 rounded-lg bg-secondary/50 p-4">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(v) => setAgreedToTerms(v === true)}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the <span className="text-primary underline">Terms of Service</span> and{' '}
                    <span className="text-primary underline">Seller Policy</span>. I understand my shop will be reviewed before going live.
                  </Label>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-gradient-primary"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="bg-gradient-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OpenShopPage;
