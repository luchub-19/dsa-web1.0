// @vitest-environment jsdom
//
// File riêng vì loadStore()/saveStore() cần `window.localStorage` thật —
// tách khỏi sm2.test.ts (chạy ở môi trường 'node' mặc định, nhanh hơn cho
// phần logic thuần túy không cần DOM).

import { describe, it, expect, beforeEach } from 'vitest';
import { loadStore, saveStore, makeEmptyStore, makeNewCard, withCards } from '../sm2';
import { STORAGE_KEY } from '../../types/spacedRepetition';

describe('loadStore / saveStore (localStorage thật qua jsdom)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loadStore trả về null khi chưa từng lưu gì', () => {
    expect(loadStore()).toBeNull();
  });

  it('saveStore rồi loadStore lại phải ra đúng dữ liệu đã lưu (round-trip)', () => {
    const store = withCards(makeEmptyStore(), {
      'LL-01': makeNewCard('LL-01', '2026-01-01T00:00:00.000Z'),
    });
    saveStore(store);
    const loaded = loadStore();
    expect(loaded).not.toBeNull();
    expect(loaded?.cards['LL-01'].chunk_id).toBe('LL-01');
    expect(loaded?.schema_version).toBe(1);
  });

  it('loadStore trả về null nếu dữ liệu trong localStorage bị hỏng (không phải JSON hợp lệ)', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ dữ liệu json bị hỏng không parse được');
    expect(loadStore()).toBeNull();
  });

  it('loadStore trả về null nếu schema_version không khớp (dữ liệu từ phiên bản cũ/tương lai)', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schema_version: 999, cards: {}, last_updated: '' })
    );
    expect(loadStore()).toBeNull();
  });

  it('saveStore không throw khi localStorage đầy (QuotaExceededError) — fail-soft', () => {
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    const store = makeEmptyStore();
    expect(() => saveStore(store)).not.toThrow();
    window.localStorage.setItem = originalSetItem;
  });
});
