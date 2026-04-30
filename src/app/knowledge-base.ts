import courseData from '../../course.json';

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
}

export const SCENARIOS: SystemDesignScenario[] = courseData as SystemDesignScenario[];
