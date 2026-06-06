import { motion } from 'framer-motion';
import laptopImage from '@/assets/1.png';
import mobileImage from '@/assets/2.png';

const HeroSection = () => {
  return (
    <>
      {/* Mobile/Tablet Hero - Hidden on desktop (lg and up) */}
      <section className="lg:hidden relative overflow-hidden bg-gradient-to-b from-[#fafafa] to-background dark:from-[#090d16] dark:to-background pt-24 sm:pt-28 pb-0">
        {/* Soft background glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-10 top-0 h-80 w-80 rounded-full bg-primary/5 blur-2xl dark:bg-primary/10" />
          <div className="absolute -right-10 top-10 h-80 w-80 rounded-full bg-coral/5 blur-2xl dark:bg-coral/10" />
        </div>

        <div className="container relative px-8 sm:px-6">
          <div className="mx-auto max-w-2xl text-center flex flex-col items-center">
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-3xl xs:text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-sans leading-[1.2] mb-1"
            >
              All Your <span className="text-[#2563eb] dark:text-[#60a5fa]">Favorite</span> Shops <br />
              In One Place
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="text-sm sm:text-base text-muted-foreground font-medium mt-3"
            >
              Zimbabwe's biggest Virtual Mall
            </motion.p>

            {/* Mobile Mockup Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 0.2, ease: 'easeOut' }}
              className="mt-10 w-full max-w-sm xs:max-w-md sm:max-w-lg px-4 flex justify-center"
            >
              <img
                src={mobileImage}
                alt="Tenga Platform on Mobile"
                className="w-full h-auto max-h-[70vh] sm:max-h-[75vh] object-contain select-none filter drop-shadow-xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Desktop/Large Screen Hero - Visible only on lg and up */}
      <section className="hidden lg:block relative overflow-hidden bg-gradient-to-b from-[#fafafa] to-background dark:from-[#090d16] dark:to-background pt-16 pb-0">
        {/* Soft background glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
          <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-coral/5 blur-3xl dark:bg-coral/10" />
        </div>

        <div className="container relative px-8 sm:px-6">
          <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-5xl xl:text-6xl font-extrabold tracking-tight text-foreground font-sans leading-[1.2] mb-2"
            >
              All Your <span className="text-[#2563eb] dark:text-[#60a5fa]">Favorite</span> Shops <br />
              In One Place
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="text-base sm:text-lg text-muted-foreground font-medium mt-4"
            >
              Zimbabwe's biggest Virtual Mall
            </motion.p>

            {/* Laptop Mockup Image */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 0.2, ease: 'easeOut' }}
              className="mt-8 w-full max-w-5xl px-4 flex justify-center"
            >
              <img
                src={laptopImage}
                alt="Tenga Platform on Laptop"
                className="w-full h-auto max-h-[65vh] object-contain select-none filter drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
