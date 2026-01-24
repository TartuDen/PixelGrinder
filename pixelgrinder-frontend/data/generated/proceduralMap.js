// File: data/generated/proceduralMap.js
import { map1Data } from "./map1Data.js";

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const collectTiles = (layer) => {
  const freq = new Map();
  layer.forEach((row) => {
    row.forEach((tile) => {
      if (tile === -1) return;
      freq.set(tile, (freq.get(tile) || 0) + 1);
    });
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tile]) => tile);
};

const pickFirstTile = (layer) => {
  for (let y = 0; y < layer.length; y += 1) {
    for (let x = 0; x < layer[y].length; x += 1) {
      if (layer[y][x] !== -1) return layer[y][x];
    }
  }
  return 0;
};

const buildLayer = (width, height, fillValue) => {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = new Array(width).fill(fillValue);
    rows.push(row);
  }
  return rows;
};

const carveRect = (layer, x, y, w, h, value) => {
  const maxY = Math.min(layer.length, y + h);
  const maxX = Math.min(layer[0].length, x + w);
  for (let yy = Math.max(0, y); yy < maxY; yy += 1) {
    for (let xx = Math.max(0, x); xx < maxX; xx += 1) {
      layer[yy][xx] = value;
    }
  }
};

export const generateProceduralMap = ({
  seed = 12345,
  width = 128,
  height = 128,
  tileWidth = map1Data.tileWidth,
  tileHeight = map1Data.tileHeight,
} = {}) => {
  const rng = mulberry32(seed);

  const backgroundTiles = collectTiles(map1Data.layers.background).slice(0, 5);
  const pathTiles = collectTiles(map1Data.layers.paths).slice(0, 3);
  const collisionTile = pickFirstTile(map1Data.layers.collisions);
  const gatherTile = pickFirstTile(map1Data.layers.gather_rock);

  const baseTile =
    backgroundTiles.length > 0
      ? backgroundTiles[0]
      : pickFirstTile(map1Data.layers.background);
  const pathTile = pathTiles.length > 0 ? pathTiles[0] : baseTile;

  const background = buildLayer(width, height, baseTile);
  const paths = buildLayer(width, height, -1);
  const collisions = buildLayer(width, height, -1);
  const gather = buildLayer(width, height, -1);

  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  // Add subtle texture to grassland only.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rng() < 0.06 && backgroundTiles.length > 2) {
        const idx = 2 + Math.floor(rng() * (backgroundTiles.length - 2));
        background[y][x] = backgroundTiles[idx];
      }
    }
  }

  // Clear obstacles, paths, and gatherables for a clean grass base.
  carveRect(paths, 0, 0, width, height, -1);
  carveRect(collisions, 0, 0, width, height, -1);
  carveRect(gather, 0, 0, width, height, -1);

  const objects = {
    GameObjects: [
      {
        id: 1,
        name: "HeroStart",
        type: "",
        x: midX * tileWidth,
        y: midY * tileHeight,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
      },
      {
        id: 2,
        name: "MobSpawnZone1",
        type: "",
        x: Math.max(0, midX * tileWidth - tileWidth * 2),
        y: Math.max(0, midY * tileHeight - tileHeight * 2),
        width: tileWidth * 4,
        height: tileHeight * 4,
        rotation: 0,
        visible: true,
      },
    ],
  };

  return {
    width,
    height,
    tileWidth,
    tileHeight,
    layers: {
      background,
      paths,
      collisions,
      gather_rock: gather,
    },
    objects,
  };
};
