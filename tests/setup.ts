import { vi } from 'vitest';

// Chrome extension API mock (content.ts が import 時に参照するため事前に設定)
(globalThis as any).chrome = {
  i18n: {
    getMessage: vi.fn((key: string) => key),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
};
