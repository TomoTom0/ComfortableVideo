import { vi } from 'vitest';

// chrome.storage.sync のモック用ストア。
// テストからは (globalThis as any).__setMockStorage({...}) で内容を差し替え、
// (globalThis as any).__getMockStorage() で現在値を確認できる
const storageStore: Record<string, unknown> = {};

type StorageChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  areaName: string,
) => void;
const storageListeners: StorageChangeListener[] = [];

(globalThis as any).__setMockStorage = (values: Record<string, unknown>) => {
  for (const key of Object.keys(storageStore)) {
    delete storageStore[key];
  }
  Object.assign(storageStore, values);
};

(globalThis as any).__getMockStorage = () => ({ ...storageStore });

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
  storage: {
    sync: {
      // 実APIと同様に、デフォルト値オブジェクトを渡すと未保存キーはデフォルトで補完する
      get: vi.fn(async (defaults?: Record<string, unknown>) => {
        if (defaults && typeof defaults === 'object') {
          const result: Record<string, unknown> = {};
          for (const [key, defaultValue] of Object.entries(defaults)) {
            result[key] = key in storageStore ? storageStore[key] : defaultValue;
          }
          return result;
        }
        return { ...storageStore };
      }),
      // 実APIと同様に、set すると storage.onChanged リスナへ変更を通知する
      set: vi.fn(async (items: Record<string, unknown>) => {
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: storageStore[key], newValue: value };
          storageStore[key] = value;
        }
        for (const listener of [...storageListeners]) {
          listener(changes, 'sync');
        }
      }),
    },
    onChanged: {
      addListener: vi.fn((listener: StorageChangeListener) => {
        storageListeners.push(listener);
      }),
    },
  },
};
