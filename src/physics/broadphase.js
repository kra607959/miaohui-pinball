import { bounds } from './shapes.js';

export function createGrid(shapes, size) {
  const cells = new Map();
  const coord = n => Math.floor(n / size);
  for (const shape of shapes) {
    const [x1, y1, x2, y2] = bounds(shape).map(coord);
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      const key = `${x}:${y}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(shape);
    }
  }
  return (x, y, radius) => {
    const result = new Set();
    for (let cy = coord(y - radius); cy <= coord(y + radius); cy++) {
      for (let cx = coord(x - radius); cx <= coord(x + radius); cx++) {
        const bucket = cells.get(`${cx}:${cy}`);
        if (bucket) for (const shape of bucket) result.add(shape);
      }
    }
    return result;
  };
}
