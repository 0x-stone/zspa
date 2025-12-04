'use client';

import { useState, useEffect } from 'react';
import { Cause } from '@/lib/types/fundraiser';
import { CauseCard } from './CauseCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface CauseCarouselProps {
  causes: Cause[];
  summary?: string;
}

export function CauseCarousel({ causes, summary }: CauseCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 768) setItemsPerPage(1);
      else if (window.innerWidth < 1024) setItemsPerPage(2);
      else setItemsPerPage(3);
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const totalPages = Math.ceil(causes.length / itemsPerPage);
  const visibleCauses = causes.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, causes.length);

  return (
    <div className="w-full py-6 px-4 bg-gradient-to-b from-surface-elevated to-surface rounded-2xl border border-border my-4">
      {/* Summary Header */}
      {summary && (
        <div className="mb-6">
          <p className="text-base text-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative">
        {/* Navigation Buttons */}
        {totalPages > 1 && (
          <>
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10',
                'w-12 h-12 rounded-full bg-surface-elevated border-2 border-border',
                'flex items-center justify-center transition-all duration-300',
                'hover:border-primary hover:bg-primary/10 hover:scale-110',
                'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100',
                'shadow-lg backdrop-blur-sm'
              )}
            >
              <ChevronLeft className="w-6 h-6 text-foreground" />
            </button>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10',
                'w-12 h-12 rounded-full bg-surface-elevated border-2 border-border',
                'flex items-center justify-center transition-all duration-300',
                'hover:border-primary hover:bg-primary/10 hover:scale-110',
                'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100',
                'shadow-lg backdrop-blur-sm'
              )}
            >
              <ChevronRight className="w-6 h-6 text-foreground" />
            </button>
          </>
        )}

        {/* Cards Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2"
          >
            {visibleCauses.map((cause, index) => (
              <motion.div
                key={cause.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CauseCard cause={cause} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentPage
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-border hover:bg-primary/50'
              )}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Page Counter */}
      {totalPages > 1 && (
        <div className="text-center mt-4">
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {causes.length} matches
          </span>
        </div>
      )}
    </div>
  );
}
