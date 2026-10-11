import { MatchedTheme, ThemeType } from '../types';

export const THEME_DEFINITIONS: Record<ThemeType, { prefixes: string[]; label: string; color: string }> = {
  'Delivery': {
    prefixes: [
      'deliver',
      'ship',
      'courier',
      'dispatch',
      'packag',
      'parcel',
      'transit',
      'delay',
      'late',
      'ontime',
      'arriv',
      'carrier',
      'postage',
      'fedex',
      'ups',
      'dhl',
      'usps',
      'tracking',
      'order',
    ],
    label: 'Delivery',
    color: '#38BDF8', // Cyan/Sky
  },
  'Product Quality': {
    prefixes: [
      'qualit',
      'defect',
      'broke',
      'durab',
      'sturd',
      'cheap',
      'flaw',
      'craft',
      'materi',
      'fabric',
      'finish',
      'tear',
      'crack',
      'shatter',
      'faulty',
      'solid',
      'premium',
      'stain',
      'smell',
      'leak',
      'burn',
      'malfunction',
      'shoddy',
    ],
    label: 'Product Quality',
    color: '#818CF8', // Indigo
  },
  'Customer Service': {
    prefixes: [
      'servic',
      'support',
      'agent',
      'rep',
      'assist',
      'courte',
      'rude',
      'polite',
      'unhelp',
      'advisor',
      'chat',
      'ticket',
      'contact',
      'email',
      'phone',
      'call',
      'staff',
      'clerk',
      'operator',
    ],
    label: 'Customer Service',
    color: '#F472B6', // Pink
  },
  'Price/Value': {
    prefixes: [
      'pric',
      'cost',
      'expens',
      'cheap',
      'worth',
      'value',
      'deal',
      'bargain',
      'ripoff',
      'rip-off',
      'overpric',
      'afford',
      'budget',
      'discount',
      'charge',
      'dollar',
      'fee',
      'overcharg',
    ],
    label: 'Price/Value',
    color: '#FBBF24', // Amber
  },
  'Website/App Experience': {
    prefixes: [
      'web',
      'site',
      'app',
      'checkout',
      'ui',
      'ux',
      'login',
      'bug',
      'crash',
      'glitch',
      'error',
      'slow',
      'lag',
      'screen',
      'button',
      'interfac',
      'navigat',
      'cart',
      'portal',
      'click',
    ],
    label: 'Website/App Experience',
    color: '#A78BFA', // Violet
  },
  'Returns/Refunds': {
    prefixes: [
      'return',
      'refund',
      'exchang',
      'replac',
      'money back',
      'reimburs',
      'warrant',
      'rma',
      'cancel',
    ],
    label: 'Returns/Refunds',
    color: '#FB7185', // Rose
  },
};

export const ALL_THEMES: ThemeType[] = [
  'Delivery',
  'Product Quality',
  'Customer Service',
  'Price/Value',
  'Website/App Experience',
  'Returns/Refunds',
];

/**
 * Extracts themes by case-insensitive keyword matching on word beginnings (prefixes).
 */
export function extractThemes(text: string): { themes: ThemeType[]; themeDetails: MatchedTheme[] } {
  const lower = text.toLowerCase();
  // Tokenize into clean words
  const words = lower
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const matchedThemeDetails: MatchedTheme[] = [];
  const matchedThemes: ThemeType[] = [];

  for (const theme of ALL_THEMES) {
    const { prefixes } = THEME_DEFINITIONS[theme];
    const foundWords = new Set<string>();

    for (const prefix of prefixes) {
      // Check multi-word prefixes first (e.g. "money back")
      if (prefix.includes(' ') && lower.includes(prefix)) {
        foundWords.add(prefix);
        continue;
      }

      // Check single-word beginnings
      for (const word of words) {
        if (word.startsWith(prefix)) {
          foundWords.add(word);
        }
      }
    }

    if (foundWords.size > 0) {
      matchedThemes.push(theme);
      matchedThemeDetails.push({
        theme,
        keywords: Array.from(foundWords),
      });
    }
  }

  return {
    themes: matchedThemes,
    themeDetails: matchedThemeDetails,
  };
}
