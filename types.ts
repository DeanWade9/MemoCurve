export interface Flashcard {
  id: string;
  content: string; // The core word/phrase
  meaning?: string;
  example?: string;
  aiQuestion?: string; // Cache the AI question
  
  recordedTime: number; // Timestamp of creation
  reviewCount: number;
  
  reviewDateList: number[]; // Array of timestamps for the 12 Ebbinghaus stages
  completedReviewDates: number[]; // Array of timestamps when reviews were actually completed
  nextScheduledReview: number; // Timestamp of next review
  
  isArchived?: boolean; // For soft deletion
}

export interface AppConfig {
  reviewDurationTrigger: number; // Seconds, default 10
  showAiQuestionOnFront: boolean;
  frontFields: ('content' | 'meaning' | 'example' | 'aiQuestion')[];
  backFields: ('content' | 'meaning' | 'example')[];
  // Mobile placeholders
  reminderMethod: 'None' | 'Push' | 'SMS' | 'Email';
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  REVIEW = 'REVIEW',
  SETTINGS = 'SETTINGS',
  IMPORT = 'IMPORT'
}

// Ebbinghaus intervals in minutes from creation time
// 30m, 1h, 12h, 1d(24h), 2d, 4d, 7d, 15d, 30d, 3m(90d), 6m(180d), 1y(365d)
export const EBBINGHAUS_INTERVALS_MINUTES = [
  30, 
  60, 
  720, 
  1440, 
  2880, 
  5760, 
  10080, 
  21600, 
  43200, 
  129600, 
  259200, 
  525600
];

export const DEFAULT_CONFIG: AppConfig = {
  reviewDurationTrigger: 10,
  showAiQuestionOnFront: true,
  frontFields: ['aiQuestion'],
  backFields: ['content', 'meaning', 'example'],
  reminderMethod: 'None'
};
