import { describe, expect, test } from 'bun:test';
import { referenceValueCents } from './referenceValue';

describe('reference value', () => {
  test('multiplies held shares by the reference price', () => {
    expect(referenceValueCents(20, '339.675000')).toBe(679360);
  });

  test('does not produce a value for invalid units or quotes', () => {
    expect(referenceValueCents(-1, '100')).toBeUndefined();
    expect(referenceValueCents(1, 'not-a-price')).toBeUndefined();
  });
});
