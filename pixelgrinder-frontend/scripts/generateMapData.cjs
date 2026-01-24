const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "public", "assets", "map", "map1.tmj");
const outputPath = path.join(__dirname, "..", "data", "generated", "map1Data.js");

const raw = fs.readFileSync(inputPath, "utf8");
const tmj = JSON.parse(raw);
const tileset = tmj.tilesets && tmj.tilesets[0];
const firstgid = tileset && Number.isFinite(tileset.firstgid) ? tileset.firstgid : 1;

const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const FLIP_MASK = ~(FLIP_H | FLIP_V | FLIP_D);

const toIndex = (gid) => {
  if (!gid) return -1;
  const clean = (gid >>> 0) & FLIP_MASK;
  return clean - firstgid;
};

const layers = {};
const objects = {};

(tmj.layers || []).forEach((layer) => {
  if (layer.type === "tilelayer") {
    const data = Array.isArray(layer.data) ? layer.data : [];
    const rows = [];
    for (let y = 0; y < tmj.height; y += 1) {
      const row = [];
      for (let x = 0; x < tmj.width; x += 1) {
        const idx = y * tmj.width + x;
        row.push(toIndex(data[idx]));
      }
      rows.push(row);
    }
    layers[layer.name] = rows;
  }
  if (layer.type === "objectgroup") {
    objects[layer.name] = layer.objects || [];
  }
});

const output = {
  width: tmj.width,
  height: tmj.height,
  tileWidth: tmj.tilewidth,
  tileHeight: tmj.tileheight,
  layers,
  objects,
};

const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });
const contents = "// File: data/generated/map1Data.js (generated)\n" +
  "export const map1Data = " + JSON.stringify(output) + ";\n";

fs.writeFileSync(outputPath, contents, "utf8");
console.log(`Wrote ${outputPath}`);
