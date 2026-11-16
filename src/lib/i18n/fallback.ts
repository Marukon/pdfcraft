import { type Locale } from './config';
import zh from '../../../messages/zh.json';

// Type for nested translation messages
export type NestedMessages = {
  [key: string]: string | NestedMessages;
};

export async function loadMessages(_locale: Locale): Promise<NestedMessages> {
  return zh;
}

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue(obj, 'common.buttons.submit')
 */
export function getNestedValue(
  obj: NestedMessages,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: NestedMessages | string | undefined = obj;

  for (const key of keys) {
    if (current === undefined || typeof current === 'string') {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Get translation with fallback to the default locale
 * If the key doesn't exist in the target locale, returns the the default locale translation
 */
export function getTranslationWithFallback(
  messages: NestedMessages,
  fallbackMessages: NestedMessages,
  key: string
): string {
  // Try to get the translation from the target locale
  const translation = getNestedValue(messages, key);
  
  if (translation !== undefined) {
    return translation;
  }

  // Fall back to the default locale
  const englishTranslation = getNestedValue(fallbackMessages, key);
  
  if (englishTranslation !== undefined) {
    return englishTranslation;
  }

  // If not found in the default locale either, return the key itself
  return key;
}

/**
 * Merge messages with the default locale fallback
 * Creates a complete messages object where missing keys are filled from the default locale
 */
export function mergeWithFallback(
  messages: NestedMessages,
  fallbackMessages: NestedMessages
): NestedMessages {
  const result: NestedMessages = {};

  // First, copy all the default locale messages as base
  function deepCopy(source: NestedMessages, target: NestedMessages): void {
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (typeof value === 'string') {
        target[key] = value;
      } else {
        target[key] = {};
        deepCopy(value, target[key] as NestedMessages);
      }
    }
  }

  deepCopy(fallbackMessages, result);

  // Then, override with locale-specific messages
  function deepMerge(source: NestedMessages, target: NestedMessages): void {
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (typeof value === 'string') {
        target[key] = value;
      } else if (typeof target[key] === 'object' && target[key] !== null) {
        deepMerge(value, target[key] as NestedMessages);
      } else {
        target[key] = {};
        deepMerge(value, target[key] as NestedMessages);
      }
    }
  }

  deepMerge(messages, result);

  return result;
}

/**
 * Create a translation function with automatic fallback
 */
export function createTranslator(
  messages: NestedMessages,
  fallbackMessages: NestedMessages
): (key: string, params?: Record<string, string | number>) => string {
  return (key: string, params?: Record<string, string | number>): string => {
    let translation = getTranslationWithFallback(messages, fallbackMessages, key);

    // Replace parameters in the translation
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(
          new RegExp(`\\{${paramKey}\\}`, 'g'),
          String(paramValue)
        );
      }
    }

    return translation;
  };
}

/**
 * Check if a translation key exists in a locale
 */
export function hasTranslation(
  messages: NestedMessages,
  key: string
): boolean {
  return getNestedValue(messages, key) !== undefined;
}

/**
 * Get all missing translation keys for a locale compared to the default locale
 */
export function getMissingKeys(
  messages: NestedMessages,
  fallbackMessages: NestedMessages,
  prefix: string = ''
): string[] {
  const missingKeys: string[] = [];

  function checkKeys(
    english: NestedMessages,
    target: NestedMessages,
    currentPrefix: string
  ): void {
    for (const key of Object.keys(english)) {
      const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
      const englishValue = english[key];
      const targetValue = target[key];

      if (typeof englishValue === 'string') {
        if (targetValue === undefined) {
          missingKeys.push(fullKey);
        }
      } else {
        checkKeys(
          englishValue,
          (targetValue as NestedMessages) || {},
          fullKey
        );
      }
    }
  }

  checkKeys(fallbackMessages, messages, prefix);
  return missingKeys;
}
