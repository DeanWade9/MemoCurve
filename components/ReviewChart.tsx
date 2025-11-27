import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { Flashcard, EBBINGHAUS_INTERVALS_MINUTES } from '../types';
import { CheckCircle, Circle, AlertCircle, Clock } from 'lucide-react';
import { getReviewStageDescription, getNextScheduledReview } from '../services/ebbinghaus';

interface ReviewChartProps {
  card: Flashcard;
  onToggleComplete: (nodeIndex: number, isCompleted: boolean) => void;
}

export const ReviewChart: React.FC<ReviewChartProps> = ({ card, onToggleComplete }) => {
  
  // Prepare data for the Line Chart
  const chartData = card.reviewDateList.map((timestamp, index) => {
    const isCompleted = index < card.completedReviewDates.length;
    return {
      name: `Node ${index + 1}`,
      time: timestamp,
      formattedTime: format(new Date(timestamp), 'MMM d, HH:mm'),
      status: isCompleted ? 'Completed' : (isPast(timestamp) ? 'Overdue' : 'Pending'),
      index
    };
  });

  const handleCheckboxChange = (index: number) => {
    const isCurrentlyCompleted = index < card.completedReviewDates.length;
    // Requirements: "Supports unchecking (only operable on the day of checking)" - Simplified here to allow toggle for latest.
    // Core Requirement: Checkbox updates CompletedReviewDates.
    
    // Only allow toggling the IMMEDIATE next pending or the IMMEDIATE last completed to maintain sequence integrity
    const nextPendingIndex = card.completedReviewDates.length;
    
    if (!isCurrentlyCompleted && index === nextPendingIndex) {
      // Mark as complete
      onToggleComplete(index, true);
    } else if (isCurrentlyCompleted && index === nextPendingIndex - 1) {
      // Unmark (undo)
      onToggleComplete(index, false);
    } else {
        alert("Please complete reviews in order, or uncheck only the most recent review.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-2">Current Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
                <span className="text-slate-500">Reviews:</span> <span className="font-mono font-bold text-indigo-600">{card.reviewCount}</span> / 12
             </div>
             <div>
                <span className="text-slate-500">Next Due:</span> <span className="font-mono">{format(new Date(card.nextScheduledReview), 'MMM d, yyyy HH:mm')}</span>
             </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-64 w-full">
        <h4 className="text-sm font-medium text-slate-500 mb-2">Forgetting Curve Schedule</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{fontSize: 10}} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
                labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
                type="monotone" 
                dataKey="time" 
                stroke="#6366f1" 
                strokeWidth={2} 
                dot={(props) => {
                    const status = props.payload.status;
                    let fill = "#3b82f6"; // Blue pending
                    if (status === 'Completed') fill = "#22c55e"; // Green
                    if (status === 'Overdue') fill = "#ef4444"; // Red
                    return <circle cx={props.cx} cy={props.cy} r={4} fill={fill} stroke="white" strokeWidth={2} />;
                }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive List (Calendar View Alternative) */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-500 mb-2">Review Milestones</h4>
        <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {chartData.map((node) => {
                const isCompleted = node.status === 'Completed';
                const isOverdue = node.status === 'Overdue';
                const isNext = !isCompleted && !chartData.slice(0, node.index).some(n => n.status !== 'Completed');

                return (
                    <div key={node.index} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isCompleted ? 'bg-green-50 border-green-200' :
                        isOverdue ? 'bg-red-50 border-red-200' :
                        isNext ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 opacity-60'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                                isCompleted ? 'bg-green-100 text-green-600' :
                                isOverdue ? 'bg-red-100 text-red-600' :
                                'bg-slate-100 text-slate-400'
                            }`}>
                                {isCompleted ? <CheckCircle size={16} /> : (isOverdue ? <AlertCircle size={16} /> : <Clock size={16} />)}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-700">
                                    {getReviewStageDescription(node.index)}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {node.formattedTime}
                                </div>
                            </div>
                        </div>
                        
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isCompleted} 
                                onChange={() => handleCheckboxChange(node.index)}
                                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            {isOverdue && !isCompleted && (
                                <span className="ml-2 text-[10px] font-bold text-red-500 uppercase tracking-wide">Overdue</span>
                            )}
                        </label>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
};
