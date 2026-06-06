import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import vid1 from '@/assets/vid1.mp4';
import vid2 from '@/assets/vid2.mp4';

const videoSlides = [
  {
    videoSrc: vid2,
    shopSlug: 'fortheculture',
    shopName: 'For the Culture',
  },
  {
    videoSrc: vid1,
    shopSlug: 'knottonest',
    shopName: 'Knot to Nest',
  },
];

const VideoCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % videoSlides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % videoSlides.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + videoSlides.length) % videoSlides.length);
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const handleSlideClick = () => {
    navigate(`/shop/${videoSlides[currentIndex].shopSlug}`);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.5 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.5 },
      },
    }),
  };

  return (
    <section className="py-6 sm:py-10 bg-background overflow-hidden w-full">
      <div
        onClick={handleSlideClick}
        className="group relative overflow-hidden bg-black aspect-[97/25] select-none cursor-pointer w-full"
      >
        {/* Slides */}
        <div className="absolute inset-0 w-full h-full">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full"
            >
              <video
                ref={videoRef}
                key={videoSlides[currentIndex].videoSrc}
                src={videoSlides[currentIndex].videoSrc}
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnded}
                className="w-full h-full object-cover pointer-events-none"
              />
              
              {/* Visual Overlay gradient for brand consistency & contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 border border-white/10 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center active:scale-95"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 border border-white/10 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center active:scale-95"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Indicators / Dot controllers */}
        <div className="absolute bottom-4 right-1/2 translate-x-1/2 z-10 flex gap-2">
          {videoSlides.map((_, index) => (
            <button
              type="button"
              key={index}
              onClick={(e) => handleDotClick(index, e)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoCarousel;
