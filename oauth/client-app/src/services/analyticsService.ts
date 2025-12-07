// Analytics service to analyze notes data

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesAnalytics {
  totalNotes: number;
  totalWords: number;
  totalCharacters: number;
  averageWordsPerNote: number;
  averageCharactersPerNote: number;
  longestNote: {
    id: string;
    title: string;
    wordCount: number;
  } | null;
  shortestNote: {
    id: string;
    title: string;
    wordCount: number;
  } | null;
  notesPerMonth: { [key: string]: number };
  wordFrequency: { word: string; count: number }[];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function getWordFrequency(text: string, topN: number = 10): { word: string; count: number }[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3); // Filter short words
  
  const frequency: { [key: string]: number } = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

export function analyzeNotes(notes: Note[]): NotesAnalytics {
  if (notes.length === 0) {
    return {
      totalNotes: 0,
      totalWords: 0,
      totalCharacters: 0,
      averageWordsPerNote: 0,
      averageCharactersPerNote: 0,
      longestNote: null,
      shortestNote: null,
      notesPerMonth: {},
      wordFrequency: []
    };
  }

  // Calculate word counts for each note
  const noteStats = notes.map(note => ({
    id: note.id,
    title: note.title,
    wordCount: countWords(note.content),
    charCount: note.content.length,
    date: new Date(note.createdAt)
  }));

  // Total words and characters
  const totalWords = noteStats.reduce((sum, n) => sum + n.wordCount, 0);
  const totalCharacters = noteStats.reduce((sum, n) => sum + n.charCount, 0);

  // Find longest and shortest notes
  const sorted = [...noteStats].sort((a, b) => b.wordCount - a.wordCount);
  const longestNote = sorted[0];
  const shortestNote = sorted[sorted.length - 1];

  // Notes per month
  const notesPerMonth: { [key: string]: number } = {};
  noteStats.forEach(note => {
    const monthKey = `${note.date.getFullYear()}-${String(note.date.getMonth() + 1).padStart(2, '0')}`;
    notesPerMonth[monthKey] = (notesPerMonth[monthKey] || 0) + 1;
  });

  // Word frequency across all notes
  const allContent = notes.map(n => n.content).join(' ');
  const wordFrequency = getWordFrequency(allContent);

  return {
    totalNotes: notes.length,
    totalWords,
    totalCharacters,
    averageWordsPerNote: Math.round(totalWords / notes.length),
    averageCharactersPerNote: Math.round(totalCharacters / notes.length),
    longestNote: {
      id: longestNote.id,
      title: longestNote.title,
      wordCount: longestNote.wordCount
    },
    shortestNote: {
      id: shortestNote.id,
      title: shortestNote.title,
      wordCount: shortestNote.wordCount
    },
    notesPerMonth,
    wordFrequency
  };
}
