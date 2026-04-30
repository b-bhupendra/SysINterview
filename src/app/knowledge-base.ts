import courseData from '../../course.json';
import fundamentalsData from '../../fundamentals.json';
import flashcardsData from '../assets/flashcards.json';
import quizzesData from '../assets/quizzes.json';

export interface SystemDesignScenario {
  id: string;
  title: string;
  description: string;
  difficulty?: string;
  requirements: string[];
  key_topics?: string[];
  theory?: string;
  components?: string[];
  bottlenecks?: string[];
  diagramHints?: string;
  deep_dive?: string;
}

export interface Fundamental {
  name: string;
  definition: string;
  use_case: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category: string;
  difficulty: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const SCENARIOS: SystemDesignScenario[] = (courseData as any).scenarios || courseData;
export const FUNDAMENTALS: Fundamental[] = fundamentalsData as Fundamental[];
export const FLASHCARDS: Flashcard[] = flashcardsData as Flashcard[];
export const QUIZZES: QuizQuestion[] = quizzesData as QuizQuestion[];
