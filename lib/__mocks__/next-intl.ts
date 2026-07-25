// Test double for next-intl. Every message resolves to its own key, so a test
// can assert behaviour without loading the message catalogue (which the
// message checker already guards separately).

type Chunks = unknown;
type RichValues = Record<string, (chunks: Chunks) => Chunks>;

export interface TestTranslator {
  (key: string): string;
  rich: (key: string, values?: RichValues) => string;
}

export function useTranslations(namespace?: string): TestTranslator {
  const key = (k: string) => (namespace ? `${namespace}.${k}` : k);
  const t = ((k: string) => key(k)) as TestTranslator;
  t.rich = (k: string) => key(k);
  return t;
}
