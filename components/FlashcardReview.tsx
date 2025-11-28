import React, { useState, useEffect, useRef } from 'react';
import { Flashcard, AppConfig } from '../types';
import { Check, Clock, TrendingUp, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { ReviewChart } from './ReviewChart';
import { generateQuestionForContent } from '../services/geminiService';
import { formatDistanceToNow } from 'date-fns';

interface FlashcardReviewProps {
  cards: Flashcard[];
  config: AppConfig;
  onUpdateCard: (card: Flashcard) => void;
  onExit: () => void;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({ cards, config, onUpdateCard, onExit }) => {
  // Sort cards by NextScheduledReview
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isChartOpen, setIsChartOpen] = useState(false);
  
  // Track if the CURRENT session for this specific card has triggered a save.
  // This prevents the "infinite loop" while the user stares at the card after completion.
  const [hasRegisteredReview, setHasRegisteredReview] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Queue
  useEffect(() => {
    // Sort: Overdue/Due first, then future
    const sorted = [...cards].sort((a, b) => a.nextScheduledReview - b.nextScheduledReview);
    setQueue(sorted);
  }, [cards]);

  const currentCard = queue[currentIndex];

  // Timer Logic
  useEffect(() => {
    setTimer(0);
    setHasRegisteredReview(false); // Reset session state for new card
    setIsFlipped(false);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      // Only increment timer if we haven't finished the review yet
      setHasRegisteredReview((alreadyDone) => {
        if (!alreadyDone) {
          setTimer(prev => prev + 1);
        }
        return alreadyDone;
      });
    }, 1000);

    // AI Generation Check
    if (currentCard && !currentCard.aiQuestion && config.frontFields.includes('aiQuestion')) {
        generateQuestionForContent(currentCard.content).then(q => {
             if (currentCard.aiQuestion !== q) {
                onUpdateCard({ ...currentCard, aiQuestion: q });
             }
        });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentCard?.id]); 

  // Check Timer Threshold
  useEffect(() => {
    if (!hasRegisteredReview && timer >= config.reviewDurationTrigger) {
      handleReviewSuccess();
    }
  }, [timer, hasRegisteredReview, config.reviewDurationTrigger]);

  const handleReviewSuccess = () => {
    if (!currentCard) return;

    const now = Date.now();
    // GRACE PERIOD: Allow review 10 minutes (600000ms) before the exact time.
    // This solves the "Do I have to wait for the exact minute?" anxiety.
    const GRACE_PERIOD_MS = 10 * 60 * 1000;
    const isDue = currentCard.nextScheduledReview <= (now + GRACE_PERIOD_MS);

    // CRITICAL FIX: 
    // We removed the "isAlreadyReviewedToday" check because it broke the 30min and 1hr intervals.
    // Instead, we ensure we haven't already completed the node corresponding to the current review count.
    // E.g. If reviewCount is 0, we are doing Node 1. If completedReviewDates has length 1, we already did it.
    const isDuplicateForCurrentNode = currentCard.completedReviewDates.length > currentCard.reviewCount;

    if (isDue && !isDuplicateForCurrentNode) {
        setHasRegisteredReview(true); // Stop the timer loop immediately UI-side

        const updatedCard: Flashcard = {
          ...currentCard,
          reviewCount: currentCard.reviewCount + 1,
          completedReviewDates: [...currentCard.completedReviewDates, now],
          // Recalculate next scheduled logic
          nextScheduledReview: currentCard.reviewDateList[currentCard.completedReviewDates.length + 1] || currentCard.reviewDateList[currentCard.reviewDateList.length - 1]
        };
        onUpdateCard(updatedCard);
    } else {
        // If not due yet (e.g. user just looking at a future card), we just stop the timer visual
        // but don't increment the database count.
        setHasRegisteredReview(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
    }
  };

  const handleToggleCompleteFromChart = (index: number, isCompleted: boolean) => {
      if (!currentCard) return;
      
      let newCompletedDates = [...currentCard.completedReviewDates];
      let newReviewCount = currentCard.reviewCount;

      if (isCompleted) {
          newCompletedDates.push(Date.now());
          newReviewCount++;
      } else {
          newCompletedDates.pop();
          newReviewCount--;
      }

      const updatedCard = {
          ...currentCard,
          completedReviewDates: newCompletedDates,
          reviewCount: newReviewCount,
          nextScheduledReview: currentCard.reviewDateList[newCompletedDates.length] || currentCard.reviewDateList[11]
      };
      onUpdateCard(updatedCard);
  };

  if (!currentCard) return <div className="p-10 text-center">No cards to review.</div>;

  const renderFields = (fields: string[]) => {
    const validFields = fields.filter(f => {
        if (f === 'content') return true;
        if (f === 'meaning' && currentCard.meaning) return true;
        if (f === 'example' && currentCard.example) return true;
        if (f === 'aiQuestion') return true; // Always try to render AI question placeholder if checked
        return false;
    });

    if (validFields.length === 0) return <div className="text-slate-400 italic">No fields selected in settings</div>;

    return validFields.map(field => {
      let value = '';
      let label = '';
      let isMissing = false;
      
      switch(field) {
        case 'content': value = currentCard.content; label = ''; break;
        case 'meaning': value = currentCard.meaning || ''; label = 'Meaning'; isMissing = !value; break;
        case 'example': value = currentCard.example || ''; label = 'Example'; isMissing = !value; break;
        case 'aiQuestion': value = currentCard.aiQuestion || (currentCard.content ? 'Generating question...' : ''); label = 'AI Question'; isMissing = !currentCard.aiQuestion; break;
      }

      if (isMissing && field !== 'aiQuestion') return null; // Skip empty optional fields
      
      return (
        <div key={field} className="mb-6 last:mb-0 pointer-events-none select-none">
           {label && <div className="text-xs uppercase font-bold text-slate-400 mb-1 tracking-wider">{label}</div>}
           <div className={`text-slate-800 ${field === 'content' ? 'text-3xl font-bold' : 'text-lg'}`}>
             {value || (field === 'aiQuestion' ? <span className="animate-pulse text-slate-300">...</span> : '')}
           </div>
        </div>
      );
    });
  };

  const progressPercentage = Math.min((timer / config.reviewDurationTrigger) * 100, 100);
  
  // Calculate due status for UI
  const now = Date.now();
  const GRACE_PERIOD_MS = 10 * 60 * 1000;
  const isDue = currentCard.nextScheduledReview <= (now + GRACE_PERIOD_MS);
  const timeUntilDue = currentCard.nextScheduledReview - now;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto p-4">
       
       {/* Top Bar */}
       <div className="flex justify-between items-center mb-6">
          <button onClick={onExit} className="text-slate-500 hover:text-slate-800 font-medium">Exit Review</button>
          <div className="text-sm font-medium text-slate-600">
             Card {currentIndex + 1} / {queue.length}
          </div>
       </div>

       {/* Info Banner for Early/Late */}
       {!isDue && (
          <div className="mb-4 text-center bg-yellow-50 text-yellow-700 p-2 rounded text-sm flex items-center justify-center gap-2">
             <AlertCircle size={16} />
             <span>Not due yet. Scheduled for {formatDistanceToNow(currentCard.nextScheduledReview, { addSuffix: true })}. (Reviewing now won't advance progress)</span>
          </div>
       )}

       {/* Card Area */}
       <div className="flex-1 relative perspective-1000 group w-full max-w-2xl mx-auto my-4">
          <div 
             className={`relative w-full h-full duration-500 preserve-3d cursor-pointer transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
             onClick={() => setIsFlipped(!isFlipped)}
          >
             {/* Front */}
             <div className={`absolute inset-0 backface-hidden bg-white rounded-2xl flex flex-col justify-center items-center p-8 text-center glow-border shadow-2xl`}>
                {renderFields(config.frontFields)}
                <div className="absolute bottom-6 text-xs text-blue-300 font-medium uppercase tracking-widest pointer-events-none">Tap card to flip</div>
             </div>

             {/* Back */}
             <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-xl flex flex-col justify-center items-center p-8 text-center`}>
                {renderFields(config.backFields)}
             </div>
          </div>
       </div>

       {/* Controls */}
       <div className="mt-6 flex items-center justify-between gap-4 max-w-2xl mx-auto w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <button 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className="p-3 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-600" />
          </button>

          <div className="flex-1 flex flex-col items-center gap-2 px-4">
             <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ease-linear ${hasRegisteredReview ? 'bg-green-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${progressPercentage}%` }}
                />
             </div>
             <div className="flex gap-2 text-xs text-slate-500 font-medium">
                {hasRegisteredReview ? 
                    <span className="flex items-center text-green-600 font-bold"><Check size={14} className="mr-1"/> {isDue ? "Review Recorded" : "Viewed (Not Due)"}</span> : 
                    <span className="flex items-center"><Clock size={14} className="mr-1"/> Focusing... {timer}s / {config.reviewDurationTrigger}s</span>
                }
             </div>
          </div>

          <button 
            onClick={() => setIsChartOpen(true)}
            className="p-3 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
            title="View Ebbinghaus Curve"
          >
            <TrendingUp size={20} />
          </button>

          <button 
             onClick={handleNext}
             disabled={currentIndex === queue.length - 1}
             className="p-3 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
             <ChevronRight size={24} className="text-slate-600" />
          </button>
       </div>

       <Modal 
         isOpen={isChartOpen} 
         onClose={() => setIsChartOpen(false)} 
         title="Forgetting Curve Progress"
       >
         {currentCard && (
            <ReviewChart 
                card={currentCard} 
                onToggleComplete={handleToggleCompleteFromChart}
            />
         )}
       </Modal>
    </div>
  );
};