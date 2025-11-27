import React, { useState, useEffect, useRef } from 'react';
import { Flashcard, AppConfig } from '../types';
import { RotateCw, Check, Clock, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { Modal } from './Modal';
import { ReviewChart } from './ReviewChart';
import { generateQuestionForContent } from '../services/geminiService';

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
  const [hasRegisteredReview, setHasRegisteredReview] = useState(false);
  
  // Fix: Use ReturnType<typeof setInterval> instead of NodeJS.Timeout to support environments without Node types
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Queue
  useEffect(() => {
    // Sort: Overdue first, then by time
    const sorted = [...cards].sort((a, b) => a.nextScheduledReview - b.nextScheduledReview);
    setQueue(sorted);
  }, [cards]);

  const currentCard = queue[currentIndex];

  // Timer Logic
  useEffect(() => {
    setTimer(0);
    setHasRegisteredReview(false);
    setIsFlipped(false);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    // AI Generation Check
    if (currentCard && !currentCard.aiQuestion && config.frontFields.includes('aiQuestion')) {
        generateQuestionForContent(currentCard.content).then(q => {
             onUpdateCard({ ...currentCard, aiQuestion: q });
        });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, queue]);

  // Check Timer Threshold
  useEffect(() => {
    if (!hasRegisteredReview && timer >= config.reviewDurationTrigger) {
      setHasRegisteredReview(true);
      handleReviewSuccess();
    }
  }, [timer, hasRegisteredReview, config.reviewDurationTrigger]);

  const handleReviewSuccess = () => {
    if (!currentCard) return;

    const now = Date.now();
    const updatedCard: Flashcard = {
      ...currentCard,
      reviewCount: currentCard.reviewCount + 1,
      completedReviewDates: [...currentCard.completedReviewDates, now],
      // Recalculate next scheduled review is handled by the data layer usually, 
      // but for atomic update here we update nextScheduled based on the schedule list
      nextScheduledReview: currentCard.reviewDateList[currentCard.completedReviewDates.length + 1] || currentCard.reviewDateList[currentCard.reviewDateList.length - 1]
    };
    onUpdateCard(updatedCard);
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

  // Manual update from Chart
  const handleToggleCompleteFromChart = (index: number, isCompleted: boolean) => {
      if (!currentCard) return;
      
      let newCompletedDates = [...currentCard.completedReviewDates];
      let newReviewCount = currentCard.reviewCount;

      if (isCompleted) {
          // Check if index matches expectation (append current time)
          newCompletedDates.push(Date.now());
          newReviewCount++;
      } else {
          // Remove last
          newCompletedDates.pop();
          newReviewCount--;
      }

      // Update card
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
    return fields.map(field => {
      let value = '';
      let label = '';
      
      switch(field) {
        case 'content': value = currentCard.content; label = ''; break;
        case 'meaning': value = currentCard.meaning || ''; label = 'Meaning'; break;
        case 'example': value = currentCard.example || ''; label = 'Example'; break;
        case 'aiQuestion': value = currentCard.aiQuestion || 'Generating question...'; label = 'AI Question'; break;
      }
      
      if (!value) return null;

      return (
        <div key={field} className="mb-6">
           {label && <div className="text-xs uppercase font-bold text-slate-400 mb-1 tracking-wider">{label}</div>}
           <div className={`text-slate-800 ${field === 'content' ? 'text-3xl font-bold' : 'text-lg'}`}>
             {value}
           </div>
        </div>
      );
    });
  };

  const progressPercentage = Math.min((timer / config.reviewDurationTrigger) * 100, 100);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto p-4">
       
       {/* Top Bar */}
       <div className="flex justify-between items-center mb-6">
          <button onClick={onExit} className="text-slate-500 hover:text-slate-800">Exit Review</button>
          <div className="text-sm font-medium text-slate-600">
             Card {currentIndex + 1} / {queue.length}
          </div>
       </div>

       {/* Card Area */}
       <div className="flex-1 relative perspective-1000 group">
          <div 
             className={`relative w-full h-full duration-500 preserve-3d cursor-pointer transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
             onClick={() => setIsFlipped(!isFlipped)}
          >
             {/* Front */}
             <div className="absolute inset-0 backface-hidden bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col justify-center items-center p-8 text-center hover:shadow-2xl transition-shadow">
                {renderFields(config.frontFields)}
                <div className="absolute bottom-4 text-xs text-slate-400">Tap to flip</div>
             </div>

             {/* Back */}
             <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-50 border border-slate-200 rounded-2xl shadow-xl flex flex-col justify-center items-center p-8 text-center">
                {renderFields(config.backFields)}
             </div>
          </div>
       </div>

       {/* Controls */}
       <div className="mt-8 flex items-center justify-between gap-4">
          <button 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className="p-4 rounded-full bg-white shadow text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft />
          </button>

          <div className="flex-1 flex flex-col items-center gap-2">
             <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ease-linear ${hasRegisteredReview ? 'bg-green-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${progressPercentage}%` }}
                />
             </div>
             <div className="flex gap-2 text-xs text-slate-500">
                {hasRegisteredReview ? 
                    <span className="flex items-center text-green-600 font-bold"><Check size={12} className="mr-1"/> Reviewed</span> : 
                    <span className="flex items-center"><Clock size={12} className="mr-1"/> Reviewing... {timer}s</span>
                }
             </div>
          </div>

          <button 
            onClick={() => setIsChartOpen(true)}
            className="p-3 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-col gap-1 text-sm font-medium"
          >
            <TrendingUp size={20} />
          </button>

          <button 
             onClick={handleNext}
             disabled={currentIndex === queue.length - 1}
             className="p-4 rounded-full bg-white shadow text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
             <ChevronRight />
          </button>
       </div>

       <Modal 
         isOpen={isChartOpen} 
         onClose={() => setIsChartOpen(false)} 
         title="Review Progress"
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