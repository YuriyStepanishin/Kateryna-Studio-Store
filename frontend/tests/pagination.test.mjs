import test from 'node:test';
import assert from 'node:assert/strict';
import { productWindow, PAGE_SIZE } from '../src/utils/pagination.ts';
test('desktop renders 20 items per page with a partial last page', () => {
  assert.equal(PAGE_SIZE, 20);
  assert.deepEqual(productWindow(45, 1, 20, true), {
    start: 20,
    end: 40,
    page: 1,
    pageCount: 3,
    remaining: 5,
  });
  assert.equal(productWindow(45, 2, 20, true).end, 45);
});
test('compact mode accumulates pages without moving the first item', () => {
  assert.equal(productWindow(45, 0, 40, false).start, 0);
  assert.equal(productWindow(45, 0, 40, false).end, 40);
  assert.equal(productWindow(45, 0, 60, false).remaining, 0);
});
test('shrinking result sets and zero results do not expose an empty out of range page', () => {
  assert.equal(productWindow(5, 9, 20, true).page, 0);
  assert.equal(productWindow(0, 9, 20, true).end, 0);
  assert.equal(productWindow(0, 9, 20, true).pageCount, 0);
});
