import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  localeConfig,
  locales,
  type NestedMessages,
  getNestedValue,
  getTranslationWithFallback,
  mergeWithFallback,
  getLocalizedPath,
  isValidLocale,
} from '@/lib/i18n';
import zhMessages from '../../../messages/zh.json';

const baseMessages: NestedMessages = zhMessages;
const partialMessages: NestedMessages = { common: { brand: 'PDFCraft' } };

describe('i18n Property Tests', () => {
  /**
   * Property: All supported locales have valid configuration
   */
  it('all supported locales have valid configuration', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_LOCALES),
        (locale) => {
          const config = LOCALE_CONFIG[locale];
          expect(config).toBeDefined();
          expect(config.name).toBeTruthy();
          expect(config.nativeName).toBeTruthy();
          expect(['ltr', 'rtl']).toContain(config.direction);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('registers only Simplified Chinese and preserves localized URLs', () => {
    expect(locales).toEqual(['zh']);
    expect(DEFAULT_LOCALE).toBe('zh');
    expect(localeConfig.zh.nativeName).toBe('简体中文');
    expect(isValidLocale('zh-TW')).toBe(false);
    expect(getLocalizedPath('/zh/tools/merge-pdf', 'zh')).toBe('/zh/tools/merge-pdf');
    expect(getLocalizedPath('/zhushi', 'zh')).toBe('/zh/zhushi');
  });

  /**
   * Property: Default locale is always in supported locales
   */
  it('default locale is in supported locales', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });



  /**
   * Property: All non-Arabic locales have LTR direction
   */
  it('all locales have correct text direction', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_LOCALES),
        (locale) => {
          const config = LOCALE_CONFIG[locale];
          return config.direction === 'ltr';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: nextjs-pdf-toolkit, Property 6: Translation Fallback**
   * **Validates: Requirements 3.6**
   * 
   * For any translation key that does not exist in a partial catalog,
   * requesting that key SHALL return the Simplified Chinese translation value.
   */
  it('Property 6: missing translations fall back to Simplified Chinese', () => {
    // Get all keys from Simplified Chinese messages
    const getAllKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        if (typeof value === 'string') {
          keys.push(fullKey);
        } else if (typeof value === 'object' && value !== null) {
          keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        }
      }
      return keys;
    };

    const englishKeys = getAllKeys(zhMessages);

    fc.assert(
      fc.property(
        // Generate a random key that exists in Simplified Chinese
        fc.constantFrom(...englishKeys),
        (key) => {
          // Get the translation with fallback
          const result = getTranslationWithFallback(
            partialMessages,
            baseMessages,
            key
          );

          // Get the Simplified Chinese value
          const englishValue = getNestedValue(
            baseMessages,
            key
          );

          // The result should either be the locale-specific translation
          // or fall back to Simplified Chinese (never undefined for valid Simplified Chinese keys)
          if (englishValue !== undefined) {
            // Result should be a string (either locale-specific or Simplified Chinese fallback)
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: nextjs-pdf-toolkit, Property 6: Translation Fallback (Nonexistent Keys)**
   * **Validates: Requirements 3.6**
   * 
   * For any nonexistent key in both locale and Simplified Chinese,
   * the fallback mechanism should return the key itself.
   */
  it('Property 6: nonexistent keys return the key itself', () => {
    fc.assert(
      fc.property(
        // Generate random nonexistent keys
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')),
        (randomKey) => {
          const nonexistentKey = `nonexistent.${randomKey}`;

          const result = getTranslationWithFallback(
            partialMessages,
            baseMessages,
            nonexistentKey
          );

          // Should return the key itself when not found anywhere
          expect(result).toBe(nonexistentKey);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: nextjs-pdf-toolkit, Property 6: Merged Messages Completeness**
   * **Validates: Requirements 3.6**
   * 
   * For any locale, merging with Simplified Chinese fallback should produce
   * a messages object that contains all Simplified Chinese keys.
   */
  it('Property 6: merged messages contain all Simplified Chinese keys', () => {
    const getAllKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        if (typeof value === 'string') {
          keys.push(fullKey);
        } else if (typeof value === 'object' && value !== null) {
          keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        }
      }
      return keys;
    };

    const englishKeys = getAllKeys(zhMessages);

    // Merge partial messages with Simplified Chinese fallback
    const mergedMessages = mergeWithFallback(
      partialMessages,
      baseMessages
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...englishKeys),
        (key) => {
          const value = getNestedValue(mergedMessages, key);
          // Every Simplified Chinese key should exist in merged messages
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: nextjs-pdf-toolkit, Property 5: URL Locale Prefix**
   * **Validates: Requirements 3.4**
   * 
   * For any page path and any supported locale, the generated URL 
   * SHALL contain the locale code as a prefix segment (e.g., /en/, /ja/, /ar/).
   */
  it('Property 5: generated URLs contain locale prefix', () => {
    // Generate valid path segments (alphanumeric, hyphens, no leading/trailing slashes in segment)
    const pathSegmentArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
      .filter(s => s.length > 0 && s.length <= 30);

    // Generate paths with 0-3 segments
    const pathArb = fc.array(pathSegmentArb, { minLength: 0, maxLength: 3 })
      .map(segments => segments.length > 0 ? '/' + segments.join('/') : '/');

    fc.assert(
      fc.property(
        fc.constantFrom(...locales),
        pathArb,
        (locale, path) => {
          const localizedPath = getLocalizedPath(path, locale);

          // The localized path should start with the locale prefix
          expect(localizedPath).toMatch(new RegExp(`^/${locale}(/|$)`));

          // The locale prefix should be a valid locale
          const extractedLocale = localizedPath.split('/')[1];
          expect(isValidLocale(extractedLocale)).toBe(true);
          expect(extractedLocale).toBe(locale);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: nextjs-pdf-toolkit, Property 5: URL Locale Prefix Replacement**
   * **Validates: Requirements 3.4**
   * 
   * For any path that already has a locale prefix, generating a localized path
   * with a different locale SHALL replace the old locale with the new one.
   */
  it('Property 5: locale prefix replacement works correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...locales),
        fc.constantFrom(...locales),
        fc.constantFrom('/tools/merge-pdf', '/about', '/faq', '/privacy', '/'),
        (originalLocale, newLocale, basePath) => {
          // Create a path with the original locale
          const pathWithLocale = `/${originalLocale}${basePath === '/' ? '' : basePath}`;

          // Generate localized path with new locale
          const result = getLocalizedPath(pathWithLocale, newLocale);

          // Result should have the new locale prefix
          expect(result).toMatch(new RegExp(`^/${newLocale}(/|$)`));

          // Result should not contain the original locale (unless it's the same)
          if (originalLocale !== newLocale) {
            // The path should not have double locale prefixes
            const segments = result.split('/').filter(Boolean);
            const localeSegments = segments.filter(s => isValidLocale(s));
            expect(localeSegments.length).toBe(1);
            expect(localeSegments[0]).toBe(newLocale);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: nextjs-pdf-toolkit, Property 5: All Locales Produce Valid Prefixed URLs**
   * **Validates: Requirements 3.4**
   * 
   * For any supported locale, generating a URL for the root path
   * SHALL produce a URL with that locale as the first path segment.
   */
  it('Property 5: all locales produce valid prefixed URLs for root', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_LOCALES),
        (locale) => {
          const localizedPath = getLocalizedPath('/', locale);

          // Should be exactly /{locale}/
          expect(localizedPath).toBe(`/${locale}/`);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
