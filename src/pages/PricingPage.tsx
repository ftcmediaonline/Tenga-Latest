import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for getting started",
    features: ["Up to 10 products", "Basic analytics", "Standard support", "2% commission per sale"],
    cta: "Get Started",
    popular: false,
    gradient: "from-slate-500/5 to-slate-500/0",
    borderGlow: "hover:border-slate-500/30",
  },
  {
    name: "Growth",
    price: "$15",
    period: "/mo",
    description: "For growing businesses",
    features: ["Up to 100 products", "Advanced analytics", "Priority support", "1.5% commission per sale", "Custom shop branding", "Promotional tools"],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-primary/10 via-primary/5 to-transparent",
    borderGlow: "border-primary/50 hover:border-primary/80 shadow-[0_0_20px_rgba(var(--primary),0.1)]",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large-scale sellers",
    features: ["Unlimited products", "Full analytics suite", "Dedicated account manager", "1% commission per sale", "API access", "Custom integrations"],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-indigo-500/5 to-indigo-500/0",
    borderGlow: "hover:border-indigo-500/30",
  },
];

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PricingPage = () => {
  const { user } = useAuth();
  const [hasShop, setHasShop] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasShop(false);
      return;
    }
    supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => setHasShop(!!data));
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <Header />
      
      <main className="flex-1 container py-10 md:py-20 max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10 md:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight mt-4 mb-4 pb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground"
          >
            Simple, Transparent Pricing
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Choose the plan that fits your business. Start selling today with no upfront costs and upgrade whenever you scale.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="flex"
            >
              <Card
                className={`w-full flex flex-col justify-between border bg-card/40 backdrop-blur-md relative transition-all duration-300 ${plan.borderGlow} ${
                  plan.popular ? "md:scale-105 z-20 mt-4 md:mt-0" : ""
                }`}
              >
                {/* Internal gradient mesh background */}
                <div className={`absolute inset-0 bg-gradient-to-b ${plan.gradient} pointer-events-none rounded-[inherit]`} />

                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className="text-center pt-8 relative z-10">
                  <CardTitle className="text-2xl font-bold tracking-tight">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground/80 mt-1 min-h-[40px]">
                    {plan.description}
                  </CardDescription>
                  <div className="flex items-baseline justify-center mt-4">
                    <span className="text-4xl md:text-5xl font-extrabold tracking-tight">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground font-semibold text-sm ml-1">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6 pt-2 pb-8 flex-1 flex flex-col justify-between relative z-10">
                  <ul className="space-y-3.5 my-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-foreground/95">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4">
                    <Button 
                      className={`w-full h-11 text-sm font-semibold tracking-wide transition-all duration-300 ${
                        plan.popular 
                          ? "bg-gradient-primary hover:opacity-90 shadow-lg hover:shadow-primary/20" 
                          : "hover:bg-accent"
                      }`}
                      variant={plan.popular ? "default" : "outline"} 
                      asChild
                    >
                      <Link
                        to={
                          plan.cta === "Contact Sales"
                            ? "/contact-sales"
                            : hasShop
                            ? `/upgrade-plan?plan=${plan.name.toLowerCase()}`
                            : `/open-shop?plan=${plan.name.toLowerCase()}`
                        }
                      >
                        {hasShop
                          ? plan.name === "Starter"
                            ? "Switch to Starter"
                            : `Upgrade to ${plan.name}`
                          : plan.cta}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* Simple FAQ / Trust element */}
        <div className="mt-20 text-center max-w-lg mx-auto bg-card/20 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            Have questions about enterprise custom integration? 
            <Link to="/contact-sales" className="text-primary hover:underline font-semibold ml-1">Contact Sales</Link>
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PricingPage;
