declare module 'vader-sentiment' {
  export interface PolarityScores {
    neg: number;
    neu: number;
    pos: number;
    compound: number;
  }

  export class SentimentIntensityAnalyzer {
    static polarity_scores(text: string): PolarityScores;
  }

  const vader: {
    SentimentIntensityAnalyzer: typeof SentimentIntensityAnalyzer;
  };

  export default vader;
}
