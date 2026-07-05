import { describe, it, expect } from 'vitest';
import {
  todayISO,
  addDays,
  isDueOnOrBefore,
  applyReview,
  makeNewCard,
  getDueChunkIds,
  makeEmptyStore,
  withCards,
} from '../sm2';
import { EF_DEFAULT, EF_MIN } from '../../types/spacedRepetition';
import type { SM2CardRecord, SM2Grade } from '../../types/spacedRepetition';

// ─────────────────────────────────────────────────────────────────────────────
// lib/sm2.ts là "bộ não" của toàn app — quyết định khi nào học sinh phải ôn
// lại. 1 lỗi tính toán ở đây (ví dụ interval âm, EF vượt ngưỡng, ngày ôn sai
// lệch múi giờ) sẽ ảnh hưởng ÂM THẦM tới trải nghiệm học của mọi người dùng
// mà không ai nhận ra ngay — vì vậy test file này ưu tiên phủ đúng các quy
// tắc SM-2 gốc (Wozniak 1987) hơn là chỉ test "chạy không crash".
// ─────────────────────────────────────────────────────────────────────────────

describe('todayISO', () => {
  it('trả về đúng định dạng YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('khớp với ngày thật của hệ thống (không lệch múi giờ UTC)', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayISO()).toBe(expected);
  });
});

describe('addDays', () => {
  it('cộng ngày bình thường trong cùng 1 tháng', () => {
    expect(addDays('2026-01-10', 5)).toBe('2026-01-15');
  });

  it('cộng ngày vượt qua ranh giới tháng', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
  });

  it('cộng ngày vượt qua ranh giới năm', () => {
    expect(addDays('2026-12-28', 5)).toBe('2027-01-02');
  });

  it('xử lý đúng năm nhuận (29/2)', () => {
    // 2028 là năm nhuận
    expect(addDays('2028-02-27', 2)).toBe('2028-02-29');
    expect(addDays('2028-02-27', 3)).toBe('2028-03-01');
  });

  it('cộng 0 ngày trả về nguyên ngày gốc', () => {
    expect(addDays('2026-06-15', 0)).toBe('2026-06-15');
  });

  it('không phụ thuộc "now" — kết quả xác định (deterministic)', () => {
    // Gọi nhiều lần với cùng input phải luôn ra cùng 1 kết quả,
    // chứng minh hàm thuần túy (pure), không có side effect ẩn.
    const results = Array.from({ length: 5 }, () => addDays('2026-03-01', 45));
    expect(new Set(results).size).toBe(1);
  });
});

describe('isDueOnOrBefore', () => {
  it('thẻ chưa từng ôn (next_review_date = null) luôn coi là đến hạn', () => {
    expect(isDueOnOrBefore(null, '2026-01-01')).toBe(true);
  });

  it('ngày ôn trong quá khứ => đến hạn', () => {
    expect(isDueOnOrBefore('2026-01-01', '2026-01-15')).toBe(true);
  });

  it('ngày ôn đúng hôm nay => đến hạn', () => {
    expect(isDueOnOrBefore('2026-01-15', '2026-01-15')).toBe(true);
  });

  it('ngày ôn trong tương lai => CHƯA đến hạn', () => {
    expect(isDueOnOrBefore('2026-02-01', '2026-01-15')).toBe(false);
  });
});

describe('makeNewCard', () => {
  it('khởi tạo đúng giá trị mặc định theo chuẩn SM-2', () => {
    const card = makeNewCard('LL-01', '2026-01-01T00:00:00.000Z');
    expect(card).toEqual({
      chunk_id: 'LL-01',
      ease_factor: EF_DEFAULT, // 2.5
      interval_days: 0,
      repetition_count: 0,
      next_review_date: null, // luôn đến hạn cho tới khi được ôn lần đầu
      last_review_date: null,
      grade_history: [],
      total_reviews: 0,
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('applyReview — tiến trình SM-2 chuẩn (grade >= 3)', () => {
  it('lần ôn ĐẦU TIÊN thành công (repetition 0 -> 1): interval = 1 ngày', () => {
    const card = makeNewCard('X', '2026-01-01');
    const result = applyReview(card, 4, '2026-01-10');
    expect(result.repetition_count).toBe(1);
    expect(result.interval_days).toBe(1);
    expect(result.next_review_date).toBe('2026-01-11');
  });

  it('lần ôn THỨ HAI thành công (repetition 1 -> 2): interval = 6 ngày (cố định theo spec)', () => {
    const card = makeNewCard('X', '2026-01-01');
    const afterFirst = applyReview(card, 4, '2026-01-10');
    const afterSecond = applyReview(afterFirst, 4, '2026-01-11');
    expect(afterSecond.repetition_count).toBe(2);
    expect(afterSecond.interval_days).toBe(6);
  });

  it('lần ôn THỨ BA trở đi: interval = round(interval_trước × EF_mới)', () => {
    const card = makeNewCard('X', '2026-01-01');
    const r1 = applyReview(card, 4, '2026-01-10'); // interval=1, EF thay đổi theo grade 4
    const r2 = applyReview(r1, 4, '2026-01-11');   // interval=6
    const r3 = applyReview(r2, 4, '2026-01-17');   // interval=round(6 * EF sau r3)

    const expectedInterval = Math.round(r2.interval_days * r3.ease_factor);
    expect(r3.interval_days).toBe(expectedInterval);
    expect(r3.repetition_count).toBe(3);
  });

  it('grade=5 (hoàn hảo) tăng ease_factor', () => {
    const card = makeNewCard('X', '2026-01-01');
    const result = applyReview(card, 5, '2026-01-10');
    // Công thức: EF' = EF + (0.1 - (5-5)*(0.08 + (5-5)*0.02)) = EF + 0.1
    expect(result.ease_factor).toBeCloseTo(EF_DEFAULT + 0.1, 5);
  });

  it('grade=4 (tốt) giữ nguyên ease_factor (theo đúng công thức Wozniak)', () => {
    const card = makeNewCard('X', '2026-01-01');
    const result = applyReview(card, 4, '2026-01-10');
    // EF' = EF + (0.1 - (5-4)*(0.08 + (5-4)*0.02)) = EF + (0.1 - 1*0.10) = EF + 0
    expect(result.ease_factor).toBeCloseTo(EF_DEFAULT, 5);
  });

  it('grade=3 (khó khăn) giảm ease_factor', () => {
    const card = makeNewCard('X', '2026-01-01');
    const result = applyReview(card, 3, '2026-01-10');
    // EF' = EF + (0.1 - (5-3)*(0.08 + (5-3)*0.02)) = EF + (0.1 - 2*0.12) = EF - 0.14
    expect(result.ease_factor).toBeCloseTo(EF_DEFAULT - 0.14, 5);
  });
});

describe('applyReview — reset khi trả lời sai (grade < 3)', () => {
  it.each([0, 1, 2] as SM2Grade[])('grade=%i reset repetition về 0 và interval về 1 ngày', (grade) => {
    // Bắt đầu từ 1 thẻ đã có "thâm niên" (repetition cao) để chắc chắn đây
    // đúng là RESET, không phải tình cờ trùng giá trị ban đầu.
    let card = makeNewCard('X', '2026-01-01');
    card = applyReview(card, 4, '2026-01-02'); // rep 1
    card = applyReview(card, 4, '2026-01-03'); // rep 2
    card = applyReview(card, 4, '2026-01-09'); // rep 3, interval > 1 chắc chắn

    const failed = applyReview(card, grade, '2026-02-01');
    expect(failed.repetition_count).toBe(0);
    expect(failed.interval_days).toBe(1);
    expect(failed.next_review_date).toBe('2026-02-02');
  });

  it('grade=0 (quên hoàn toàn) giảm ease_factor mạnh nhất trong các mức trượt', () => {
    const card = makeNewCard('X', '2026-01-01');
    const g0 = applyReview(card, 0, '2026-01-10').ease_factor;
    const g1 = applyReview(card, 1, '2026-01-10').ease_factor;
    const g2 = applyReview(card, 2, '2026-01-10').ease_factor;
    expect(g0).toBeLessThan(g1);
    expect(g1).toBeLessThan(g2);
  });
});

describe('applyReview — chặn dưới ease_factor (EF_MIN = 1.3)', () => {
  it('ease_factor không bao giờ giảm dưới 1.3 dù trượt liên tục nhiều lần', () => {
    let card = makeNewCard('X', '2026-01-01');
    for (let i = 0; i < 20; i++) {
      card = applyReview(card, 0, `2026-01-${String(i + 1).padStart(2, '0')}`);
    }
    expect(card.ease_factor).toBeGreaterThanOrEqual(EF_MIN);
    expect(card.ease_factor).toBeCloseTo(EF_MIN, 5);
  });
});

describe('applyReview — grade_history', () => {
  it('ghi lại lịch sử điểm theo đúng thứ tự, mới nhất ở cuối', () => {
    let card = makeNewCard('X', '2026-01-01');
    card = applyReview(card, 5, '2026-01-02');
    card = applyReview(card, 3, '2026-01-03');
    card = applyReview(card, 0, '2026-01-04');
    expect(card.grade_history).toEqual([5, 3, 0]);
  });

  it('giới hạn độ dài lịch sử ở GRADE_HISTORY_LIMIT (không phình vô hạn)', () => {
    let card = makeNewCard('X', '2026-01-01');
    for (let i = 0; i < 80; i++) {
      card = applyReview(card, 5, `2026-01-01`);
    }
    expect(card.grade_history.length).toBeLessThanOrEqual(50);
    // Vẫn phải giữ đúng giá trị GẦN NHẤT, không cắt nhầm đầu/cuối
    expect(card.grade_history[card.grade_history.length - 1]).toBe(5);
  });
});

describe('applyReview — total_reviews và tính bất biến (immutability)', () => {
  it('total_reviews tăng đúng 1 sau mỗi lần review, bất kể điểm số', () => {
    let card = makeNewCard('X', '2026-01-01');
    expect(card.total_reviews).toBe(0);
    card = applyReview(card, 0, '2026-01-02');
    expect(card.total_reviews).toBe(1);
    card = applyReview(card, 5, '2026-01-03');
    expect(card.total_reviews).toBe(2);
  });

  it('KHÔNG mutate object đầu vào — trả về bản ghi mới hoàn toàn', () => {
    const card = makeNewCard('X', '2026-01-01');
    const snapshot = { ...card };
    applyReview(card, 5, '2026-01-10');
    expect(card).toEqual(snapshot); // object gốc không bị thay đổi
  });

  it('cập nhật last_review_date đúng bằng ngày được truyền vào', () => {
    const card = makeNewCard('X', '2026-01-01');
    const result = applyReview(card, 5, '2026-03-15');
    expect(result.last_review_date).toBe('2026-03-15');
  });
});

describe('getDueChunkIds', () => {
  const today = '2026-06-15';

  it('lọc đúng: chỉ trả về thẻ đến hạn hôm nay hoặc quá hạn', () => {
    const cards: Record<string, SM2CardRecord> = {
      'chua-on': makeNewCard('chua-on', '2026-01-01'), // next_review_date null -> luôn đến hạn
      'qua-han': { ...makeNewCard('qua-han', '2026-01-01'), next_review_date: '2026-06-01' },
      'dung-hen': { ...makeNewCard('dung-hen', '2026-01-01'), next_review_date: today },
      'chua-den-han': { ...makeNewCard('chua-den-han', '2026-01-01'), next_review_date: '2026-12-31' },
    };
    const due = getDueChunkIds(cards, today);
    expect(due).toContain('chua-on');
    expect(due).toContain('qua-han');
    expect(due).toContain('dung-hen');
    expect(due).not.toContain('chua-den-han');
    expect(due.length).toBe(3);
  });

  it('sắp xếp: thẻ chưa từng ôn (null) đứng TRƯỚC thẻ đã có ngày, rồi theo thứ tự ngày tăng dần', () => {
    const cards: Record<string, SM2CardRecord> = {
      'ngay-sau': { ...makeNewCard('ngay-sau', '2026-01-01'), next_review_date: '2026-06-10' },
      'chua-on': makeNewCard('chua-on', '2026-01-01'),
      'ngay-truoc': { ...makeNewCard('ngay-truoc', '2026-01-01'), next_review_date: '2026-06-05' },
    };
    const due = getDueChunkIds(cards, today);
    expect(due).toEqual(['chua-on', 'ngay-truoc', 'ngay-sau']);
  });

  it('trả về mảng rỗng khi không có thẻ nào đến hạn', () => {
    const cards: Record<string, SM2CardRecord> = {
      a: { ...makeNewCard('a', '2026-01-01'), next_review_date: '2026-12-31' },
    };
    expect(getDueChunkIds(cards, today)).toEqual([]);
  });

  it('trả về mảng rỗng khi store rỗng', () => {
    expect(getDueChunkIds({}, today)).toEqual([]);
  });
});

describe('makeEmptyStore / withCards', () => {
  it('makeEmptyStore tạo store đúng schema_version=1 và cards rỗng', () => {
    const store = makeEmptyStore();
    expect(store.schema_version).toBe(1);
    expect(store.cards).toEqual({});
  });

  it('withCards trả về store MỚI, không mutate store gốc', () => {
    const original = makeEmptyStore();
    const newCards = { X: makeNewCard('X', '2026-01-01') };
    const updated = withCards(original, newCards);

    expect(original.cards).toEqual({}); // gốc không đổi
    expect(updated.cards).toEqual(newCards);
    expect(updated).not.toBe(original); // reference khác nhau
  });
});
