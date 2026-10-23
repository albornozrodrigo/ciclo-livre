import { sleepBucket } from '@/domain/tracking/sleep';

describe('sleepBucket (faixas da categoria Sono)', () => {
  it.each([
    [0, 'under_3h'],
    [179, 'under_3h'],
    [180, '3_6h'],
    [359, '3_6h'],
    [360, '6_9h'],
    [540, '6_9h'],
    [541, 'over_9h'],
  ])('%s min → %s', (minutes, bucket) => {
    expect(sleepBucket(minutes)).toBe(bucket);
  });
});
