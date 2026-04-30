import courseData from '../../course.json';
import fundamentalsData from '../../fundamentals.json';

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

export const SCENARIOS: SystemDesignScenario[] = courseData as SystemDesignScenario[];
export const FUNDAMENTALS: Fundamental[] = fundamentalsData as Fundamental[];
