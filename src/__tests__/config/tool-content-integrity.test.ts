import { describe, expect, it } from 'vitest';
import { getToolContent } from '@/config/tool-content';
import { locales } from '@/lib/i18n/config';
import { getAllTools } from '@/config/tools';

describe('tool content integrity', () => {
  it.each(locales)('has content for each registered tool in %s', (locale) => {
    const missing = getAllTools().map(tool => tool.id).filter(id => !getToolContent(locale, id));
    expect(missing).toEqual([]);
  });

  it('keeps Chinese tool titles localized instead of falling back to English slugs', () => {
    expect(getToolContent('zh', 'merge-pdf')?.title).toContain('合并');
    expect(getToolContent('zh', 'split-pdf')?.title).toBe('拆分PDF');
    expect(getToolContent('zh', 'compress-pdf')?.title).toBe('压缩PDF');
    expect(getToolContent('zh', 'edit-pdf')?.title).toBe('编辑PDF');
    expect(getToolContent('zh', 'organize-pdf')?.title).toBe('整理PDF');
    expect(getToolContent('zh', 'pdf-to-docx')?.title).toBe('PDF转Word');
  });
});
