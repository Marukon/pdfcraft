/**
 * Tool content exports for all languages
 * Requirements: 3.1 - Multi-language support
 */

export { toolContentEn } from './en';
export { toolContentZh } from './zh';

import { toolContentEn } from './en';
import { toolContentZh } from './zh';
import { ToolContent } from '@/types/tool';

export type Locale = 'en' | 'zh' ;

/**
 * Get tool content for a specific locale
 * Falls back to English if translation not found
 */
export function getToolContent(locale: Locale, toolId: string): ToolContent | undefined {
  const contentMap: Record<Locale, Record<string, ToolContent>> = {
    en: toolContentEn,
    zh: toolContentZh,
  };

  const localeContent = contentMap[locale];
  if (localeContent && localeContent[toolId]) {
    return localeContent[toolId];
  }

  // Fallback to English
  return toolContentEn[toolId];
}
