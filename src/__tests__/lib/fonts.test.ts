import { it, expect, vi } from 'vitest';

// `next/font` only works inside the Next.js compiler, so mock the Google font
// loaders.

vi.mock('next/font/google', () => ({
  Inter: () => ({
    variable: '--font-inter',
    className: 'inter',
    style: { fontFamily: 'Inter' },
  }),
  JetBrains_Mono: () => ({
    variable: '--font-jetbrains-mono',
    className: 'jetbrains-mono',
    style: { fontFamily: 'JetBrains Mono' },
  }),
}));

import { fontVariables } from '@/lib/fonts';

it('keeps the sans and monospace font variables', () => {
  expect(fontVariables).toContain('--font-inter');
  expect(fontVariables).toContain('--font-jetbrains-mono');
});
