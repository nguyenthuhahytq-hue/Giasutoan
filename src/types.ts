export type Grade = 1 | 2 | 3 | 4 | 5;

export interface Lesson {
  id: string;
  title: string;
  grade: Grade;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Test {
  id: string;
  title: string;
  grade: Grade;
  type: 'topic' | 'midterm' | 'final';
  questions: Question[];
  essayQuestions: string[];
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  grade: Grade;
  points: number;
  stage: number;
  unlockedItems: string[];
  history: HistoryItem[];
  chatHistory: ChatMessage[];
}

export type ViewState = 'auth' | 'home' | 'problem-input' | 'photo-grader' | 'photo-discussion' | 'game' | 'lessons' | 'test-generator' | 'history' | 'camera' | 'leaderboard';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 image
  timestamp: number;
}

export type HistoryType = 'chat' | 'quiz' | 'practice' | 'test';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  content: any; // Can be ChatMessage[] or QuizResult etc.
  timestamp: number;
  grade: Grade;
}
