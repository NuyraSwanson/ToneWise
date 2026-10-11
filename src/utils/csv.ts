import Papa from 'papaparse';
import { AnalysisItem } from '../types';

export interface CsvParsedData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export function parseCsvFile(file: File): Promise<CsvParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data.slice(0, 2000); // Spec: Max 2000 rows
        resolve({
          headers,
          rows,
          totalRows: results.data.length,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function exportReviewsToCsv(items: AnalysisItem[]): void {
  const exportData = items.map((item) => ({
    'ID': item.id,
    'Review Text': item.text,
    'Final Sentiment': item.finalSentiment.toUpperCase(),
    'Needs Review (Engines Disagree)': item.needsReview ? 'YES' : 'NO',
    'Decision Engine': item.chosenEngine,
    'VADER Sentiment': item.vader.label.toUpperCase(),
    'VADER Compound Score': item.vader.compound,
    'VADER Pos': item.vader.pos,
    'VADER Neu': item.vader.neu,
    'VADER Neg': item.vader.neg,
    'RoBERTa Sentiment': item.huggingFace ? item.huggingFace.label.toUpperCase() : 'N/A',
    'RoBERTa Prob Pos': item.huggingFace ? Number((item.huggingFace.probabilities.positive).toFixed(4)) : 'N/A',
    'RoBERTa Prob Neu': item.huggingFace ? Number((item.huggingFace.probabilities.neutral).toFixed(4)) : 'N/A',
    'RoBERTa Prob Neg': item.huggingFace ? Number((item.huggingFace.probabilities.negative).toFixed(4)) : 'N/A',
    'Themes': item.themes.join('; '),
    'Star Rating': item.starRating ?? '',
    'Date': item.date ?? '',
    'Timestamp': new Date(item.timestamp).toISOString(),
    'Source': item.source,
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tonewise_sentiment_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
