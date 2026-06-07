import { motion } from 'framer-motion';
import logo from '@/assets/logo.png';

interface PageLoaderProps {
  fullScreen?: boolean;
}

const PageLoader = ({ fullScreen = true }: PageLoaderProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background ${
        fullScreen ? 'fixed inset-0 z-50 min-h-screen w-screen' : 'py-20 w-full'
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing outer ring */}
        <motion.div
          className="absolute h-24 w-24 rounded-full border border-primary/20 bg-primary/5"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Pulsing second outer ring */}
        <motion.div
          className="absolute h-20 w-20 rounded-full border border-primary/40 bg-primary/5"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.8, 0.1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.4,
          }}
        />

        {/* Pulsing Logo */}
        <motion.div
          animate={{
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-card p-3 shadow-lg border border-border"
        >
          <img src={logo} alt="Loading..." className="h-full w-full object-contain" />
        </motion.div>
      </div>
    </div>
  );
};

export default PageLoader;
