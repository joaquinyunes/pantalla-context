import assert from "node:assert/strict";
import { test } from "node:test";
import { fitSize, frameDifference, isRegionTooSmall, luminance, normalizeRect, toSourceRect } from "../public/capture.js";

test("normalizeRect ordena las esquinas y recorta a 0..1", () => {
  assert.deepEqual(normalizeRect({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.1 }), { x: 0.2, y: 0.1, w: 0.6000000000000001, h: 0.8 });
  assert.deepEqual(normalizeRect({ x: -1, y: 0.5 }, { x: 2, y: 0.5 }), { x: 0, y: 0.5, w: 1, h: 0 });
});

test("toSourceRect: null equivale a pantalla completa", () => {
  assert.deepEqual(toSourceRect(null, 1920, 1080), { x: 0, y: 0, w: 1920, h: 1080 });
});

test("toSourceRect convierte a píxeles y nunca se sale del vídeo", () => {
  assert.deepEqual(toSourceRect({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 }, 1920, 1080), { x: 480, y: 540, w: 960, h: 270 });
  const r = toSourceRect({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }, 1000, 1000);
  assert.ok(r.x + r.w <= 1000 && r.y + r.h <= 1000);
});

test("isRegionTooSmall", () => {
  assert.equal(isRegionTooSmall({ w: 31, h: 500 }), true);
  assert.equal(isRegionTooSmall({ w: 500, h: 31 }), true);
  assert.equal(isRegionTooSmall({ w: 32, h: 32 }), false);
});

test("fitSize reduce conservando proporción y nunca amplía", () => {
  assert.deepEqual(fitSize(3136, 1568), { width: 1568, height: 784 });
  assert.deepEqual(fitSize(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitSize(1000, 1, 100), { width: 100, height: 1 });
});

test("frameDifference: iguales = 0, opuestos = 1, tamaños distintos = 1", () => {
  const black = new Uint8Array(100);
  const white = new Uint8Array(100).fill(255);
  assert.equal(frameDifference(black, black), 0);
  assert.equal(frameDifference(black, white), 1);
  assert.equal(frameDifference(black, new Uint8Array(50)), 1);
  assert.equal(frameDifference(null, black), 1);
});

test("luminance pondera los canales RGB", () => {
  const out = luminance(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 255, 255, 255, 255]));
  assert.deepEqual([...out], [76, 150, 255]);
});
