'use client';

import { useEffect, useState, useRef } from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { DonationFeed } from '@/components/donation/DonationFeed';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { FundraiserDetailsModal } from '@/components/cause/FundraiserDetailsModal';
import { TEEDetailsModal } from '@/components/tee/TEEDetailsModal';
import { PrivacyExplainerModal } from '@/components/tee/PrivacyExplainerModal';
import { CryptoPaymentModal } from '@/components/payment/CryptoPaymentModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { getTopRatedFundraisers } from '@/lib/api/fundraisers';
import { Cause } from '@/lib/types/fundraiser';
import { CauseCard } from '@/components/cause/CauseCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { isOnboarded, initializeSession } = useSessionStore();
  const { selectedFundraiserId, setSelectedFundraiser } = useUIStore();
  const [topFundraisers, setTopFundraisers] = useState<Cause[]>([]);
  const [currentDiscoveryIndex, setCurrentDiscoveryIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeSession();
    fetchTopFundraisers();
  }, [initializeSession]);

  const fetchTopFundraisers = async () => {
    try {
      const data = await getTopRatedFundraisers(10);
      setTopFundraisers(data);
    } catch (error) {
      console.error('Failed to fetch top fundraisers:', error);
    }
  };

  // Auto-scroll logic
  useEffect(() => {
    if (topFundraisers.length === 0 || isPaused) return;

    autoScrollTimerRef.current = setInterval(() => {
      setDirection(1);
      setCurrentDiscoveryIndex((prev) => (prev + 1) % topFundraisers.length);
    }, 6000);

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [topFundraisers.length, isPaused]);

  const handleNextDiscovery = () => {
    if (topFundraisers.length === 0) return;
    setDirection(1);
    setCurrentDiscoveryIndex((prev) => (prev + 1) % topFundraisers.length);
  };

  const handlePrevDiscovery = () => {
    if (topFundraisers.length === 0) return;
    setDirection(-1);
    setCurrentDiscoveryIndex((prev) => (prev - 1 + topFundraisers.length) % topFundraisers.length);
  };

  // Vertical Slide Variants
  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
      zIndex: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      y: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
      zIndex: 0,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    }),
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {!isOnboarded && <OnboardingModal />}

      <div className="pt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-5rem)]">
            
            {/* Discovery Panel - Left (Vertical Glossy Slideshow) */}
            <div className="lg:col-span-3 hidden lg:block h-full min-h-0">
              <Card 
                className="h-full flex flex-col overflow-hidden relative group border-0 bg-gradient-to-br from-surface/80 to-surface/40 backdrop-blur-xl shadow-2xl ring-1 ring-white/10"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {/* Header with Glass Effect */}
                <CardHeader className="pb-4 z-20 bg-background/40 backdrop-blur-md sticky top-0 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Top Causes
                      </CardTitle>
                    </div>
                    {topFundraisers.length > 0 && (
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground px-2 py-0.5 bg-background/50 rounded-full border border-white/10">
                        {currentDiscoveryIndex + 1} / {topFundraisers.length}
                      </span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 relative p-0 overflow-hidden">
                  {topFundraisers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                       <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin"/>
                       <p className="text-sm font-medium text-muted-foreground animate-pulse">Curating top fundraisers...</p>
                    </div>
                  ) : (
                    <div className="h-full w-full relative">
                      
                      {/* Top Control - Glass Button */}
                      <div className="absolute top-4 left-0 right-0 z-30 flex justify-center pointer-events-none">
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); handlePrevDiscovery(); }}
                          className={cn(
                            "rounded-full h-10 w-10 pointer-events-auto transition-all duration-300",
                            "bg-background/20 hover:bg-background/60 backdrop-blur-md border border-white/10 shadow-lg",
                            "text-foreground hover:scale-110 active:scale-95",
                            "opacity-0 group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0"
                          )}
                        >
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Animated Slideshow Area */}
                      <div className="absolute inset-0 flex items-center justify-center px-4">
                        <AnimatePresence initial={false} custom={direction}>
                          <motion.div
                            key={currentDiscoveryIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="absolute w-full max-w-[320px] px-2"
                          >
                             <div className="transform transition-all hover:scale-[1.02] duration-300 shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10">
                                <CauseCard cause={topFundraisers[currentDiscoveryIndex]} />
                             </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Bottom Control - Glass Button */}
                      <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); handleNextDiscovery(); }}
                          className={cn(
                            "rounded-full h-10 w-10 pointer-events-auto transition-all duration-300",
                            "bg-background/20 hover:bg-background/60 backdrop-blur-md border border-white/10 shadow-lg",
                            "text-foreground hover:scale-110 active:scale-95",
                            "opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                          )}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      {/* Vertical Progress Indicators */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20">
                        {topFundraisers.map((_, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "w-1 rounded-full transition-all duration-500",
                              idx === currentDiscoveryIndex 
                                ? "h-6 bg-primary shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
                                : "h-1 bg-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>

                      {/* Bottom Gradient Fade for Depth */}
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/40 to-transparent pointer-events-none z-10" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface - Center (Fixed Layout) */}
            <div className="lg:col-span-6 h-full min-h-0">
              <Card className="h-full flex flex-col overflow-hidden border-0 shadow-2xl bg-surface ring-1 ring-border/50">
                <CardContent className="flex-1 p-0 overflow-hidden relative">
                  <ChatInterface />
                </CardContent>
              </Card>
            </div>

            {/* Donation Feed - Right (Fixed Layout) */}
            <div className="lg:col-span-3 hidden lg:block h-full min-h-0">
              <Card className="h-full border-0 shadow-xl bg-surface/50 backdrop-blur-sm ring-1 ring-border/50">
                <DonationFeed />
              </Card>
            </div>
          </div>
        </div>
      </div>

      {selectedFundraiserId && (
        <FundraiserDetailsModal
          causeId={selectedFundraiserId}
          onClose={() => setSelectedFundraiser(null)}
        />
      )}

      <TEEDetailsModal />
      <PrivacyExplainerModal />
      <CryptoPaymentModal />
      <AuthModal />
    </div>
  );
}