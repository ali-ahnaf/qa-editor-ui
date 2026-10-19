import { expect, test } from 'vitest';
import { cropRect, type Shape } from './ImageEditor';

test('cropRect uses the last crop, normalizes, clamps and evens it', () => {
  expect(cropRect([], 640, 480)).toEqual([0, 0, 640, 480]);
  const shapes: Shape[] = [
    { kind: 'crop', points: [[10, 10], [100, 100]] },
    { kind: 'arrow', color: '#000', width: 2, points: [[0, 0], [5, 5]] },
    { kind: 'crop', points: [[700, 300.4], [-20, 20.6]] },
  ];
  expect(cropRect(shapes, 640, 480)).toEqual([0, 21, 640, 278]);
  expect(cropRect(shapes.slice(0, 2), 640, 480)).toEqual([10, 10, 90, 90]);
});
