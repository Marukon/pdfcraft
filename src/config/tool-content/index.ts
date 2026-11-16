import { toolContentZh } from './zh';
import { ToolContent } from '@/types/tool';
import type { Locale } from '@/lib/i18n/config';

export type { Locale } from '@/lib/i18n/config';

export { toolContentZh };

export function getToolContent(_locale: Locale, toolId: string): ToolContent | undefined {
  return toolContentZh[toolId];
}
