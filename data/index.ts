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

export const allLessonChunks: any[] = [
  ...(aLect01 as any[]),
  ...(bRecursion as any[]),
  ...(cFractal as any[]),
  ...(dDp as any[]),
  ...(eLect02 as any[]),
  ...(fLect03 as any[]),
  ...(gLect04Pointers as any[]),
  ...(hLect05File as any[]),
  ...(iLect05ElementDs as any[]),
  ...(jLect06Tree as any[]),
  ...(kLect07BalancedTree as any[]),
  ...(lLect08Btree as any[]),
  ...(mLect09Pq as any[]),
  ...(nLect10Hashtable as any[]),
  ...(linkedlists as any[]),
];

export function getChunkById(id: string) {
  return allLessonChunks.find((chunk: any) => chunk.id === id);
}