import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Flashcard, EBBINGHAUS_INTERVALS_MINUTES, ViewMode } from '../types';
import { generateReviewSchedule } from '../services/ebbinghaus';
import { Plus, Upload, Trash2, Search, Play, Download } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  cards: Flashcard[];
  onAddCard: (card: Flashcard) => void;
  onDeleteCards: (ids: string[]) => void;
  onStartReview: () => void;
  onUpdateCard: (card: Flashcard) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ cards, onAddCard, onDeleteCards, onStartReview, onUpdateCard }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Manual Entry Form State
  const [newContent, setNewContent] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const now = Date.now();
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      content: newContent,
      meaning: newMeaning,
      example: newExample,
      recordedTime: now,
      reviewCount: 0,
      reviewDateList: generateReviewSchedule(now),
      completedReviewDates: [],
      nextScheduledReview: generateReviewSchedule(now)[0]
    };

    onAddCard(newCard);
    setNewContent('');
    setNewMeaning('');
    setNewExample('');
    setIsAdding(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      let importedCount = 0;
      data.forEach((row: any) => {
        // Case-insensitive mapping attempt
        const content = row['Content'] || row['content'] || row['CONTENT'];
        const meaning = row['Meaning'] || row['meaning'];
        const example = row['Example'] || row['example'];

        if (content) {
           const now = Date.now();
           const newCard: Flashcard = {
             id: crypto.randomUUID(),
             content: String(content),
             meaning: String(meaning || ''),
             example: String(example || ''),
             recordedTime: now,
             reviewCount: 0,
             reviewDateList: generateReviewSchedule(now),
             completedReviewDates: [],
             nextScheduledReview: generateReviewSchedule(now)[0]
           };
           onAddCard(newCard);
           importedCount++;
        }
      });
      alert(`Imported ${importedCount} items successfully.`);
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleExport = () => {
    // 3.1.3 Review Data Export Function
    const dataToExport = cards.filter(c => selectedIds.size === 0 || selectedIds.has(c.id)).map(c => ({
        Content: c.content,
        Meaning: c.meaning,
        Example: c.example,
        RecordedTime: format(new Date(c.recordedTime), 'yyyy-MM-dd HH:mm:ss'),
        ReviewCount: c.reviewCount,
        ReviewDateList: c.reviewDateList.map(d => format(new Date(d), 'yyyy-MM-dd HH:mm')).join(', '),
        CompletedReviewDates: c.completedReviewDates.map(d => format(new Date(d), 'yyyy-MM-dd HH:mm')).join(', '),
        NextScheduledReview: format(new Date(c.nextScheduledReview), 'yyyy-MM-dd HH:mm:ss')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Review Data");
    XLSX.writeFile(wb, `Ebbinghaus_Review_Data_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);
  };

  const filteredCards = cards.filter(c => 
    c.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
      if (confirm(`Delete ${selectedIds.size} items?`)) {
          onDeleteCards(Array.from(selectedIds));
          setSelectedIds(new Set());
      }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Memory Deck</h1>
          <p className="text-slate-500">Total Cards: {cards.length} | Pending Review: {cards.filter(c => c.nextScheduledReview < Date.now()).length}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={onStartReview}
             className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md transition-all"
           >
             <Play size={18} fill="currentColor" /> Start Review
           </button>
           <button 
             onClick={() => setIsAdding(!isAdding)}
             className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
           >
             <Plus size={18} /> Add New
           </button>
           <label className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
             <Upload size={18} /> Import Excel
             <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
           </label>
           <button 
             onClick={handleExport}
             className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
           >
             <Download size={18} /> Export
           </button>
        </div>
      </div>

      {/* Manual Add Form */}
      {isAdding && (
        <form onSubmit={handleManualAdd} className="bg-slate-50 p-6 rounded-xl border border-indigo-100 mb-8 animate-in fade-in slide-in-from-top-4">
           <h3 className="font-semibold text-slate-700 mb-4">Add New Card</h3>
           <div className="grid md:grid-cols-3 gap-4 mb-4">
              <input 
                 className="border p-2 rounded" 
                 placeholder="Content (Word/Phrase) *" 
                 value={newContent}
                 onChange={e => setNewContent(e.target.value)}
                 required 
              />
              <input 
                 className="border p-2 rounded" 
                 placeholder="Meaning" 
                 value={newMeaning}
                 onChange={e => setNewMeaning(e.target.value)}
              />
              <input 
                 className="border p-2 rounded" 
                 placeholder="Example Sentence" 
                 value={newExample}
                 onChange={e => setNewExample(e.target.value)}
              />
           </div>
           <div className="flex justify-end gap-2">
             <button type="button" onClick={() => setIsAdding(false)} className="text-slate-500 px-4 py-2">Cancel</button>
             <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">Save Card</button>
           </div>
        </form>
      )}

      {/* Filter & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                   type="text" 
                   placeholder="Search content..." 
                   className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            {selectedIds.size > 0 && (
                <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100"
                >
                    <Trash2 size={16} /> Delete ({selectedIds.size})
                </button>
            )}
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                  <tr>
                     <th className="p-4 w-12"><input type="checkbox" onChange={(e) => {
                         if (e.target.checked) setSelectedIds(new Set(filteredCards.map(c => c.id)));
                         else setSelectedIds(new Set());
                     }} checked={selectedIds.size === filteredCards.length && filteredCards.length > 0}/></th>
                     <th className="p-4">Content</th>
                     <th className="p-4">Meaning</th>
                     <th className="p-4">Next Review</th>
                     <th className="p-4">Progress</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredCards.map(card => {
                      const isOverdue = card.nextScheduledReview < Date.now();
                      return (
                        <tr key={card.id} className="hover:bg-slate-50 group">
                            <td className="p-4"><input type="checkbox" checked={selectedIds.has(card.id)} onChange={() => toggleSelect(card.id)} /></td>
                            <td className="p-4 font-medium text-slate-800">{card.content}</td>
                            <td className="p-4 text-slate-600 truncate max-w-[200px]">{card.meaning}</td>
                            <td className="p-4">
                                <span className={`text-sm px-2 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {format(new Date(card.nextScheduledReview), 'MMM d, HH:mm')}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{width: `${(card.reviewCount / 12) * 100}%`}}></div>
                                </div>
                                <span className="text-xs text-slate-400 mt-1 block">{card.reviewCount} / 12</span>
                            </td>
                        </tr>
                      );
                  })}
                  {filteredCards.length === 0 && (
                      <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">No cards found. Add some to get started!</td>
                      </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
