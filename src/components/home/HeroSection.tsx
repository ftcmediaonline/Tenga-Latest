import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import heroVisual from '@/assets/hero-visual.png';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-10 sm:py-16 md:py-24">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute -left-4 top-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10" />
          <div className="absolute right-1/4 top-1/2 h-96 w-96 rounded-full bg-coral-light blur-3xl dark:bg-primary/5 dark:invisible" />
        </div>
        {/* Fluid hero visual - floats seamlessly with gradient */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={heroVisual}
            alt=""
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[90%] sm:w-[75%] md:w-[60%] max-w-2xl h-auto max-h-[85vh] object-contain object-right opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-soft-light select-none"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
        </motion.div>
      </div>

      <div className="container relative px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge - soft blue chip in dark mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 sm:px-4 sm:py-2 dark:bg-[hsl(215,55%,28%)]"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-[hsl(215,90%,80%)]" />
            <span className="text-xs sm:text-sm font-medium text-accent-foreground dark:text-white">
              Discover 500+ unique shops
            </span>
          </motion.div>

          {/* Heading - "all in" highlighted in blue for dark mode */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight xs:text-4xl sm:text-5xl md:text-6xl text-foreground"
          >
            Your favorite shops,{' '}
            <span className="text-gradient dark:text-primary dark:bg-none dark:bg-transparent dark:text-[hsl(215,80%,60%)]">
              all in
            </span>{' '}
            one place
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground md:text-xl px-1"
          >
            Browse, discover, and shop from hundreds of independent stores.{' '}
            Find unique products you won&apos;t see anywhere else.
          </motion.p>

          {/* CTA Buttons - blue solid + dark outlined in dark mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4"
          >
            <Button
              asChild
              size="lg"
              className="h-12 min-h-[48px] px-6 sm:px-8 text-base font-medium w-full sm:w-auto bg-gradient-primary dark:bg-[hsl(215,80%,50%)] dark:hover:bg-[hsl(215,80%,45%)]"
            >
              <Link to="/shops">
                Explore Shops
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 min-h-[48px] px-6 sm:px-8 text-base font-medium w-full sm:w-auto dark:bg-transparent dark:border-white dark:border dark:text-white dark:hover:bg-white/10"
            >
              <Link to="/open-shop">Open Your Shop</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-3 sm:grid sm:grid-cols-3 sm:gap-8"
          >
            {[
              { value: '500+', label: 'Unique Shops' },
              { value: '50K+', label: 'Products' },
              { value: '100K+', label: 'Happy Customers' },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center px-4 py-3 rounded-2xl bg-card/60 dark:bg-card/25 backdrop-blur-md border border-border/60 shadow-sm min-w-[100px] flex-1 sm:flex-initial sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none sm:border-none sm:shadow-none sm:p-0"
              >
                <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent dark:text-foreground sm:text-foreground sm:bg-none">
                  {stat.value}
                </div>
                <div className="mt-0.5 sm:mt-1 text-[10px] xs:text-xs sm:text-sm font-medium sm:font-normal text-muted-foreground uppercase tracking-wider sm:normal-case sm:tracking-normal">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
