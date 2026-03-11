'use strict';

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
  data: any[];
}

export const dsaCurriculum: Chapter[] = [
  {
    slug: 'lect01',
    title: 'Chương 1: Giới thiệu DSA',
    data: aLect01 as any[],
  },
  {
    slug: 'recursion',
    title: 'Chương 2: Đệ quy & Divide-and-Conquer',
    data: bRecursion as any[],
  },
  {
    slug: 'fractal',
    title: 'Chương 3: Fractal',
    data: cFractal as any[],
  },
  {
    slug: 'dp',
    title: 'Chương 4: Quy hoạch Động (Dynamic Programming)',
    data: dDp as any[],
  },
  {
    slug: 'lect02',
    title: 'Chương 5: Phân tích Thuật toán',
    data: eLect02 as any[],
  },
  {
    slug: 'lect03',
    title: 'Chương 6: Sắp xếp (Sorting)',
    data: fLect03 as any[],
  },
  {
    slug: 'pointers',
    title: 'Chương 7: Con trỏ (Pointers)',
    data: gLect04Pointers as any[],
  },
  {
    slug: 'file-stream',
    title: 'Chương 8: File & Stream',
    data: hLect05File as any[],
  },
  {
    slug: 'element-ds',
    title: 'Chương 9: Cấu trúc Dữ liệu Cơ bản',
    data: iLect05ElementDs as any[],
  },
  {
    slug: 'linked-lists',
    title: 'Chương 9+: Danh sách Liên kết (Linked Lists)',
    data: linkedlists as any[],
  },
  {
    slug: 'tree',
    title: 'Chương 10: Cây & Cây Nhị phân (Tree & Binary Tree)',
    data: jLect06Tree as any[],
  },
  {
    slug: 'balanced-tree',
    title: 'Chương 11: Cây Cân bằng (AVL, Red-Black)',
    data: kLect07BalancedTree as any[],
  },
  {
    slug: 'btree',
    title: 'Chương 12: B-tree',
    data: lLect08Btree as any[],
  },
  {
    slug: 'priority-queue',
    title: 'Chương 13: Hàng đợi Ưu tiên & Heap',
    data: mLect09Pq as any[],
  },
  {
    slug: 'hash-table',
    title: 'Chương 14: Bảng băm (Hash Table)',
    data: nLect10Hashtable as any[],
  },
];

export function getChapterBySlug(slug: string): Chapter | undefined {
  return dsaCurriculum.find((chapter) => chapter.slug === slug);
}