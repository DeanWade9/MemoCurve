import { EBBINGHAUS_INTERVALS_MINUTES } from '../types';

/**
 * Generates the full 12-step Ebbinghaus schedule based on a start time.
 * @param startTime timestamp in ms
 * @returns number[] array of 12 timestamps
 */
export const generateReviewSchedule = (startTime: number): number[] => {
  return EBBINGHAUS_INTERVALS_MINUTES.map(minutes => {
    return startTime + (minutes * 60 * 1000);
  });
};

/**
 * Finds the next scheduled review time that hasn't been completed yet.
 * @param reviewDateList 
 * @param completedReviewDates 
 * @returns timestamp of next review, or the last one if all done
 */
export const getNextScheduledReview = (reviewDateList: number[], completedReviewDates: number[]): number => {
  // We assume completedReviewDates corresponds to indices of reviewDateList roughly, 
  // but strictly we just want the first date in the list that isn't "covered" by a completion.
  // However, the requirements say: "ReviewCount increases by 1... NextScheduledReview updates to next pending node".
  
  // Logic: The number of completed reviews determines which stage we are at.
  // If we have completed 0 reviews, next is index 0.
  // If we have completed 1 review, next is index 1.
  const nextIndex = completedReviewDates.length;
  
  if (nextIndex >= reviewDateList.length) {
    return reviewDateList[reviewDateList.length - 1]; // All done, stay on last
  }
  
  return reviewDateList[nextIndex];
};

export const getReviewStageDescription = (index: number): string => {
  const stages = [
    "Short-term consolidation (30m)",
    "Short-term consolidation (1h)",
    "Short-term consolidation (12h)",
    "Mid-term formation (1d)",
    "Mid-term formation (2d)",
    "Mid-term enhancement (4d)",
    "Long-term formation (7d)",
    "Long-term enhancement (15d)",
    "Long-term consolidation (30d)",
    "Long-term deepening (3m)",
    "Long-term solidification (6m)",
    "Long-term permanence (1y)"
  ];
  return stages[index] || "Unknown Stage";
};
