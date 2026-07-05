'use strict';

import type { RawChunk } from '../types/curriculum';

import aLect01 from './A_lect01.json';
import bRecursion from './B_recursion.json';
import cFractal from './C_fractal.json';
import dDp from './D_dp.json';
import eLect02 from './E_lect02.json';
import fLect03 from './F_lect03.json';
import gLect04Pointers from './G_lect04_pointers.json';
import hLect05File from './H_lect05_file.json';
import iLect05ElementDs from './I_lect05_element_ds.json';
import jLect06Tree from './J_lect06_tree.json';
import kLect07BalancedTree from './K_lect07_balanced_tree.json';
import lLect08Btree from './L_lect08_btree.json';
import mLect09Pq from './M_lect09_pq.json';
import nLect10Hashtable from './N_lect10_hashtable.json';
import linkedlists from './linkedlists.json';

export interface Chapter {
  slug: string;
  title: string;
  data: RawChunk[];
  /**
   * Slug của bộ đề thi whiteboard tương ứng (khớp key trong
   * app/exam/[examId]/EXAM_REGISTRY). Để trống nếu chương chưa có đề thi.
   *
   * TRƯỚC: điều kiện hiện nút "Vào phòng thi" bị hard-code trong
   * learn/[slug]/page.tsx (slug === 'linked-lists' || slug === 'pointers' || ...).
   * SAU: mỗi chương tự khai báo examId — thêm/bớt đề thi không còn phải sửa
   * code hiển thị.
   *
   * LƯU Ý: bộ đề 'pointers' (data/exam_pointers.json) có 2 bài, cả 2 đều về
   * Linked List (chèn node cuối, đảo ngược danh sách) — không có bài nào
   * thật sự về nội dung "con trỏ". Vì vậy mình CHỈ gán examId cho chương
   * 'linked-lists' (đúng nội dung), KHÔNG gán cho 'pointers' hay
   * 'element-ds' như hard-code cũ. Cần bạn xác nhận/đổi tên bộ đề nếu ý
   * định ban đầu là khác.
   */
  examId?: string;
}

export const dsaCurriculum: Chapter[] = [
  {
    slug: 'lect01',
    title: 'Chương 1: Giới thiệu DSA',
    data: aLect01 as RawChunk[],
  },
  {
    slug: 'recursion',
    title: 'Chương 2: Đệ quy & Divide-and-Conquer',
    data: bRecursion as RawChunk[],
  },
  {
    slug: 'fractal',
    title: 'Chương 3: Fractal',
    data: cFractal as RawChunk[],
  },
  {
    slug: 'dp',
    title: 'Chương 4: Quy hoạch Động (Dynamic Programming)',
    data: dDp as RawChunk[],
  },
  {
    slug: 'lect02',
    title: 'Chương 5: Phân tích Thuật toán',
    data: eLect02 as RawChunk[],
  },
  {
    slug: 'lect03',
    title: 'Chương 6: Sắp xếp (Sorting)',
    data: fLect03 as RawChunk[],
  },
  {
    slug: 'pointers',
    title: 'Chương 7: Con trỏ (Pointers)',
    data: gLect04Pointers as RawChunk[],
  },
  {
    slug: 'file-stream',
    title: 'Chương 8: File & Stream',
    data: hLect05File as RawChunk[],
  },
  {
    slug: 'element-ds',
    title: 'Chương 9: Cấu trúc Dữ liệu Cơ bản',
    data: iLect05ElementDs as RawChunk[],
  },
  {
    slug: 'linked-lists',
    title: 'Chương 9+: Danh sách Liên kết (Linked Lists)',
    data: linkedlists as RawChunk[],
    examId: 'pointers', // giữ key registry cũ để không phải đổi tên file exam_pointers.json
  },
  {
    slug: 'tree',
    title: 'Chương 10: Cây & Cây Nhị phân (Tree & Binary Tree)',
    data: jLect06Tree as RawChunk[],
  },
  {
    slug: 'balanced-tree',
    title: 'Chương 11: Cây Cân bằng (AVL, Red-Black)',
    data: kLect07BalancedTree as RawChunk[],
  },
  {
    slug: 'btree',
    title: 'Chương 12: B-tree',
    data: lLect08Btree as RawChunk[],
  },
  {
    slug: 'priority-queue',
    title: 'Chương 13: Hàng đợi Ưu tiên & Heap',
    data: mLect09Pq as RawChunk[],
  },
  {
    slug: 'hash-table',
    title: 'Chương 14: Bảng băm (Hash Table)',
    data: nLect10Hashtable as RawChunk[],
  },
];

export function getChapterBySlug(slug: string): Chapter | undefined {
  return dsaCurriculum.find((chapter) => chapter.slug === slug);
}