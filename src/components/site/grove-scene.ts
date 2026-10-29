import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// The home page's living grove: a moss-wrapped sycamore root arching out of a
// mossy floor, fern clusters, pale flowers, pollen in the air, sycamore seeds
// spinning down like helicopters, the odd palmate leaf tumbling past, and a
// butterfly that loops the arch and lands on a flower. Everything is built
// from code (no models, no textures to download) and coloured from the active
// palette's --site-* tokens, so switching theme recolours the scene.
//
// mountGrove() returns a handle to recolour, pause and dispose. Under reduced
// motion it renders one still frame and stops.

export type GroveColors = { sky: string; ground: string; fog: string; moss: string; bloom: string; accent: string; sap: string };

export type GroveHandle = { setColors(c: GroveColors): void; setActive(on: boolean): void; dispose(): void };

// ---------- small deterministic noise ----------

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

const fbm = (x: number, y: number, z: number) => noise3(x, y, z) * 0.55 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.15;

/** Grey-scale vertex colours from noise: the material colour (from the palette) is multiplied by these, giving moss its patchiness. */
function mossShade(geo: THREE.BufferGeometry, scale: number, lo = 0.62, hi = 1.18) {
  const p = geo.attributes.position!;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const n = fbm(p.getX(i) * scale, p.getY(i) * scale, p.getZ(i) * scale);
    const k = lo + (hi - lo) * n;
    col[i * 3] = k * 0.96;
    col[i * 3 + 1] = k;
    col[i * 3 + 2] = k * 0.9;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// ---------- geometry builders ----------

function rootArch(points: THREE.Vector3[], radius: number, seed: number) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  const tub = 180, rad = 18;
  const geo = new THREE.TubeGeometry(curve, tub, radius, rad, false);
  const pos = geo.attributes.position!;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tub; i++) {
    const u = i / tub;
    curve.getPointAt(u, c);
    // Thicker where it meets the ground, like a root flaring into soil.
    const flare = 1 + 0.9 * Math.pow(Math.max(0, 1 - u / 0.14), 2) + 0.9 * Math.pow(Math.max(0, (u - 0.86) / 0.14), 2);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c);
      const lumpy = 0.74 + 0.42 * fbm(v.x * 2 + seed + u * 9, v.y * 2 + u * 7, v.z * 2) + 0.16 * fbm(v.x * 7 + seed, v.y * 7 + u * 30, v.z * 7);
      v.multiplyScalar(flare * lumpy).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  mossShade(geo, 3.1, 0.52, 1.3);
  return { geo, curve };
}

function blob(detail = 3, rough = 0.45, seed = 1) {
  // Welded first, so the normals come out smooth: soft moss, not faceted stone.
  const raw = new THREE.IcosahedronGeometry(1, detail);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  const g = mergeVertices(raw);
  raw.dispose();
  const p = g.attributes.position!;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + rough * (fbm(v.x * 1.7 + seed, v.y * 1.7, v.z * 1.7) - 0.5));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  mossShade(g, 3.4, 0.7, 1.25);
  return g;
}

function ground(rand: () => number) {
  const g = new THREE.PlaneGeometry(70, 46, 140, 92);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const swell = Math.exp(-((x - 2.4) ** 2 + (z + 0.6) ** 2) / 10) * 0.45; // a mound under the arch
    p.setY(i, (fbm(x * 0.28, 0, z * 0.28) - 0.5) * 0.9 + swell + (rand() - 0.5) * 0.02);
  }
  g.computeVertexNormals();
  mossShade(g, 0.9, 0.7, 1.12);
  return g;
}

/** One fern frond: a drooping rachis with paired leaflets that shrink toward the tip. Local +Z is outward. */
function frond(len: number) {
  const parts: THREE.BufferGeometry[] = [];
  const pairs = 16;
  const at = (t: number) => new THREE.Vector3(0, len * (0.95 * t - 0.62 * t * t), len * 0.92 * t);
  for (let i = 1; i <= pairs; i++) {
    const t = i / (pairs + 1);
    const base = at(t);
    const ahead = at(Math.min(1, t + 0.02)).sub(base).normalize();
    const size = len * 0.2 * Math.pow(1 - t, 0.65) + len * 0.02;
    for (const side of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      // A slim leaflet: base, two shoulders, tip, swept slightly toward the frond's tip.
      const tip = new THREE.Vector3(side * size, -size * 0.12, size * 0.32);
      const sh1 = new THREE.Vector3(side * size * 0.45, size * 0.06, size * 0.26);
      const sh2 = new THREE.Vector3(side * size * 0.5, -size * 0.1, -size * 0.02);
      const verts = [new THREE.Vector3(0, 0, 0), sh1, tip, sh2].map((p) => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.atan2(ahead.y, ahead.z) * 0.6).add(base));
      g.setFromPoints([verts[0]!, verts[1]!, verts[2]!, verts[0]!, verts[2]!, verts[3]!]);
      parts.push(g);
    }
  }
  const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map(at)), 12, len * 0.012, 4, false);
  // Leaflets carry positions only, so the stem must too for the merge.
  stem.deleteAttribute('normal');
  stem.deleteAttribute('uv');
  const merged = mergeGeometries([...parts.map((p) => p.toNonIndexed()), stem.toNonIndexed()])!;
  merged.computeVertexNormals();
  return merged;
}

function flowerParts() {
  const petals: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.SphereGeometry(0.5, 8, 6);
    p.scale(0.62, 0.16, 1);
    p.translate(0, 0, 0.55);
    p.rotateY((i / 5) * Math.PI * 2);
    petals.push(p);
  }
  const petal = mergeGeometries(petals)!;
  const center = new THREE.SphereGeometry(0.24, 10, 8);
  center.scale(1, 0.7, 1);
  center.translate(0, 0.06, 0);
  return { petal, center };
}

/** A sycamore samara: two veined wings in a V around a round seed. */
function samara() {
  const wing = new THREE.Shape();
  wing.moveTo(0, 0);
  wing.bezierCurveTo(0.12, 0.08, 0.46, 0.2, 0.86, 0.16);
  wing.bezierCurveTo(1.0, 0.13, 1.02, 0.02, 0.92, -0.02);
  wing.bezierCurveTo(0.6, -0.08, 0.2, -0.06, 0, 0);
  const a = new THREE.ShapeGeometry(wing, 10);
  const b = a.clone();
  a.rotateZ(0.5);
  b.rotateY(Math.PI);
  b.rotateZ(-0.5);
  const nut = new THREE.SphereGeometry(0.1, 10, 8);
  return mergeGeometries([a.toNonIndexed(), b.toNonIndexed(), nut.toNonIndexed()])!;
}

/** A sycamore leaf: five pointed lobes, the classic maple-like outline. */
function palmateLeaf() {
  const s = new THREE.Shape();
  const lobes = 5;
  s.moveTo(0, -0.1);
  for (let i = 0; i <= lobes; i++) {
    const a = Math.PI * 1.15 - (i / lobes) * Math.PI * 1.3; // fan from lower left to lower right
    const r = i === 2 || i === 3 ? 1 : i === 0 || i === lobes ? 0.55 : 0.85;
    const tip = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r + 0.1);
    // Broad lobes with shallow notches: a sycamore leaf, not a star.
    const mid = a + Math.PI / lobes / 1.6;
    s.quadraticCurveTo(Math.cos(a - 0.22) * r * 0.78, Math.sin(a - 0.22) * r * 0.78 + 0.1, tip.x, tip.y);
    s.quadraticCurveTo(Math.cos(mid) * r * 0.8, Math.sin(mid) * r * 0.8 + 0.1, Math.cos(mid) * r * 0.6, Math.sin(mid) * r * 0.6 + 0.1);
  }
  s.lineTo(0, -0.1);
  const g = new THREE.ShapeGeometry(s);
  g.scale(0.32, 0.32, 0.32);
  return g;
}

function butterflyWing() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.2, 0.5, 0.75, 0.62, 0.82, 0.3); // forewing
  s.bezierCurveTo(0.86, 0.1, 0.5, 0.02, 0.32, -0.02);
  s.bezierCurveTo(0.55, -0.12, 0.6, -0.45, 0.32, -0.5); // hindwing
  s.bezierCurveTo(0.12, -0.5, 0.04, -0.2, 0, 0);
  const g = new THREE.ShapeGeometry(s, 12);
  g.scale(0.22, 0.22, 0.22);
  return g;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- the scene ----------

/** A palette colour pulled toward the fog, so foliage sits in the mist instead of on top of it. */
const misted = (c: string, fog: string, k: number) => new THREE.Color(c).lerp(new THREE.Color(fog), k);

export function mountGrove(host: HTMLElement, colors: GroveColors, opts: { still: boolean }): GroveHandle {
  const small = host.clientWidth < 900;
  const rand = rng(20261029);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(colors.fog, 7, 27);
  const camera = new THREE.PerspectiveCamera(small ? 40 : 30, 1, 0.1, 80);

  const hemi = new THREE.HemisphereLight(colors.sky, colors.ground, 1.5);
  const sun = new THREE.DirectionalLight('#fff4dc', 1.6);
  sun.position.set(-4, 9, 6);
  const rim = new THREE.DirectionalLight(colors.sky, 0.6);
  rim.position.set(6, 3, -6);
  scene.add(hemi, sun, rim);

  // Where the arch stands: to the right of the copy on wide screens, centred below it on phones.
  const ax = small ? -1.1 : 1.0;

  const mossMat = new THREE.MeshStandardMaterial({ color: misted(colors.moss, colors.fog, 0.12), vertexColors: true, roughness: 1, metalness: 0 });
  const groundMat = new THREE.MeshStandardMaterial({ color: misted(colors.moss, colors.fog, 0.3), vertexColors: true, roughness: 1, metalness: 0 });
  const fernMat = new THREE.MeshStandardMaterial({ color: misted(colors.sap, colors.fog, 0.1), roughness: 0.85, side: THREE.DoubleSide });
  const petalMat = new THREE.MeshStandardMaterial({ color: colors.bloom, roughness: 0.55, emissive: colors.bloom, emissiveIntensity: 0.4 });
  const centerMat = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.7 });
  const seedMat = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.75, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: colors.sap, roughness: 0.8, side: THREE.DoubleSide });
  const wingMat = new THREE.MeshStandardMaterial({ color: colors.bloom, roughness: 0.55, side: THREE.DoubleSide, emissive: colors.accent, emissiveIntensity: 0.25 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#3a3326', roughness: 0.8 });
  const pollenTex = dotTexture();
  const pollenMat = new THREE.PointsMaterial({ color: colors.accent, size: 0.07, map: pollenTex, transparent: true, depthWrite: false, opacity: 0.9 });
  const disposables: { dispose(): void }[] = [mossMat, groundMat, fernMat, petalMat, centerMat, seedMat, leafMat, wingMat, bodyMat, pollenTex, pollenMat];

  // Floor.
  const floorGeo = ground(rand);
  const floor = new THREE.Mesh(floorGeo, groundMat);
  scene.add(floor);
  disposables.push(floorGeo);

  // The root arch and a smaller root beside it.
  const main = rootArch(
    [
      new THREE.Vector3(ax - 0.6, -0.4, 0.8),
      new THREE.Vector3(ax - 0.1, 1.5, 0.45),
      new THREE.Vector3(ax + 1.0, 3.05, -0.05),
      new THREE.Vector3(ax + 2.5, 3.35, -0.55),
      new THREE.Vector3(ax + 3.7, 2.1, -0.95),
      new THREE.Vector3(ax + 4.2, -0.4, -1.15),
    ],
    0.42,
    3,
  );
  const minor = rootArch(
    [new THREE.Vector3(ax + 3.4, -0.3, 1.2), new THREE.Vector3(ax + 4.1, 0.9, 0.9), new THREE.Vector3(ax + 5.2, 1.2, 0.4), new THREE.Vector3(ax + 6.1, -0.3, 0.1)],
    0.24,
    9,
  );
  scene.add(new THREE.Mesh(main.geo, mossMat), new THREE.Mesh(minor.geo, mossMat));
  disposables.push(main.geo, minor.geo);

  // Moss clumps hugging the arch and pooling at its feet.
  const blobGeo = blob(3, 0.5, 4);
  disposables.push(blobGeo);
  const clumpCount = small ? 110 : 190;
  const clumps = new THREE.InstancedMesh(blobGeo, mossMat, clumpCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const flowerSpots: THREE.Vector3[] = [];
  for (let i = 0; i < clumpCount; i++) {
    let s: number;
    if (i < clumpCount * 0.62) {
      const u = rand();
      main.curve.getPointAt(u, pv);
      tmp.set(rand() - 0.5, rand() * 0.9 + 0.1, rand() - 0.5).normalize().multiplyScalar(0.34 + rand() * 0.08);
      pv.add(tmp);
      s = 0.11 + rand() * 0.18;
      if (rand() < 0.55) flowerSpots.push(pv.clone().add(new THREE.Vector3(0, s * 0.8, 0)));
    } else {
      const a = rand() * Math.PI * 2;
      const r = 0.6 + rand() * 4.2;
      pv.set(ax + 1.8 + Math.cos(a) * r * 1.4, -0.12, Math.sin(a) * r * 0.7 + 0.3);
      s = 0.16 + rand() * 0.3;
      if (rand() < 0.45) flowerSpots.push(pv.clone().add(new THREE.Vector3(0, s * 0.75, 0)));
    }
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    sv.set(s, s * (i < clumpCount * 0.62 ? 0.75 + rand() * 0.25 : 0.42 + rand() * 0.2), s);
    clumps.setMatrixAt(i, m.compose(pv, q, sv));
  }
  scene.add(clumps);

  // Ferns: clusters of fronds fanned around a centre.
  const frondGeo = frond(1.3);
  disposables.push(frondGeo);
  // Wide screens keep ferns off the copy's side of the frame.
  const clusterSpots = (
    small
      ? [[ax - 0.9, 0.55], [ax - 0.2, 1.6], [ax + 3.9, -0.4], [ax + 4.9, 1.4], [ax + 1.6, 1.9]]
      : [[ax - 0.1, 1.7], [ax + 0.6, -0.2], [ax + 3.9, -0.4], [ax + 4.9, 1.4], [ax + 1.6, 1.9], [ax + 6.2, -0.8]]
  ) as [number, number][];
  const perCluster = 7;
  const ferns = new THREE.InstancedMesh(frondGeo, fernMat, clusterSpots.length * perCluster);
  const fernBase: { pos: THREE.Vector3; yaw: number; pitch: number; scale: number; phase: number }[] = [];
  for (const [x, z] of clusterSpots) {
    for (let k = 0; k < perCluster; k++) {
      fernBase.push({
        pos: new THREE.Vector3(x!, 0, z!),
        yaw: (k / perCluster) * Math.PI * 2 + rand() * 0.4,
        pitch: -0.15 - rand() * 0.25,
        scale: 0.7 + rand() * 0.55,
        phase: rand() * Math.PI * 2,
      });
    }
  }
  scene.add(ferns);

  // Pale flowers on the moss.
  const { petal, center } = flowerParts();
  disposables.push(petal, center);
  const fCount = Math.min(flowerSpots.length, small ? 46 : 90);
  const petals = new THREE.InstancedMesh(petal, petalMat, fCount);
  const centers = new THREE.InstancedMesh(center, centerMat, fCount);
  const flowerBase: { pos: THREE.Vector3; s: number; tilt: THREE.Euler; phase: number }[] = [];
  for (let i = 0; i < fCount; i++) {
    flowerBase.push({ pos: flowerSpots[i]!, s: 0.09 + rand() * 0.08, tilt: new THREE.Euler((rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.5), phase: rand() * 6 });
  }
  scene.add(petals, centers);
  // The butterfly's landing flower: the highest one on the arch.
  const landing = flowerBase.reduce((a, b) => (b.pos.y > a.pos.y ? b : a), flowerBase[0]!).pos.clone().add(new THREE.Vector3(0, 0.06, 0));

  // Sycamore seeds spinning down, and a few tumbling leaves.
  const samaraGeo = samara();
  samaraGeo.scale(0.32, 0.32, 0.32);
  const leafGeo = palmateLeaf();
  disposables.push(samaraGeo, leafGeo);
  type Faller = { pos: THREE.Vector3; fall: number; spin: number; drift: number; phase: number; rot: THREE.Euler };
  const spawn = (f: Partial<Faller>, top: boolean): Faller => ({
    pos: new THREE.Vector3(-6 + rand() * 15, top ? 5.5 + rand() * 2 : rand() * 6, -2.5 + rand() * 4.5),
    fall: 0.28 + rand() * 0.22,
    spin: 6 + rand() * 4,
    drift: 0.25 + rand() * 0.35,
    phase: rand() * 6,
    rot: new THREE.Euler(rand() * 3, rand() * 3, rand() * 3),
    ...f,
  });
  const seedCount = small ? 7 : 13;
  const seeds = new THREE.InstancedMesh(samaraGeo, seedMat, seedCount);
  const seedState = Array.from({ length: seedCount }, () => spawn({}, false));
  const leafCount = small ? 3 : 5;
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  const leafState = Array.from({ length: leafCount }, () => spawn({ fall: 0.35 + rand() * 0.2, spin: 1 + rand() }, false));
  scene.add(seeds, leaves);

  // Pollen.
  const pCount = small ? 150 : 280;
  const pPos = new Float32Array(pCount * 3);
  const pSeed = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = -6 + rand() * 15;
    pPos[i * 3 + 1] = rand() * 5.5;
    pPos[i * 3 + 2] = -3 + rand() * 6;
    pSeed[i] = rand() * 100;
  }
  const pollenGeo = new THREE.BufferGeometry();
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pollen = new THREE.Points(pollenGeo, pollenMat);
  disposables.push(pollenGeo);
  scene.add(pollen);

  // The butterfly: two wings hinged on a slim body, looping the arch and landing on its flower.
  const wingGeo = butterflyWing();
  const bodyGeo = new THREE.CapsuleGeometry(0.012, 0.09, 4, 8);
  bodyGeo.rotateX(Math.PI / 2);
  disposables.push(wingGeo, bodyGeo);
  const fly = new THREE.Group();
  const left = new THREE.Mesh(wingGeo, wingMat);
  const right = new THREE.Mesh(wingGeo, wingMat);
  right.scale.x = -1;
  const lPivot = new THREE.Group();
  const rPivot = new THREE.Group();
  left.rotation.x = -Math.PI / 2;
  right.rotation.x = -Math.PI / 2;
  lPivot.add(left);
  rPivot.add(right);
  fly.add(lPivot, rPivot, new THREE.Mesh(bodyGeo, bodyMat));
  fly.scale.setScalar(small ? 1.1 : 1.25);
  scene.add(fly);
  const flightPath = new THREE.CatmullRomCurve3(
    [
      landing.clone(),
      new THREE.Vector3(ax + 3.4, 3.9, 0.6),
      new THREE.Vector3(ax + 5.2, 2.4, 1.6),
      new THREE.Vector3(ax + 3.0, 1.4, 2.4),
      new THREE.Vector3(ax + 0.2, 2.2, 2.0),
      new THREE.Vector3(ax - 0.6, 3.5, 0.9),
    ],
    true,
    'centripetal',
  );

  // ---------- frame loop ----------

  // Phones look higher, so the grove settles into the lower half under the copy.
  const target = new THREE.Vector3(small ? 0.6 : ax + 2, small ? 3.6 : 1.5, -0.3);
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  host.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Wide screens: slide the view so the arch sits right of the copy column.
    if (small) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -w * (w > 1280 ? 0.27 : 0.31), 0, w, h);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let fs = 0; // butterfly progress along its loop, 0..1
  let rest = 0; // seconds left sitting on the flower
  const up = new THREE.Vector3(0, 1, 0);
  const look = new THREE.Vector3();

  const step = (t: number, dt: number) => {
    // Camera: a slow breath, plus a little parallax toward the pointer.
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2);
    camera.position.set(
      (small ? -0.6 : 0.4) + Math.sin(t * 0.07) * 0.25 + pointer.sx * 0.45,
      (small ? 2.4 : 2.1) + Math.sin(t * 0.11) * 0.08 - pointer.sy * 0.2,
      small ? 14 : 13.5,
    );
    camera.lookAt(target);

    // Ferns sway.
    for (let i = 0; i < fernBase.length; i++) {
      const f = fernBase[i]!;
      const sway = Math.sin(t * 0.9 + f.phase) * 0.06 + Math.sin(t * 0.37 + f.phase * 2) * 0.04;
      q.setFromEuler(new THREE.Euler(f.pitch + sway, f.yaw, sway * 0.5, 'YXZ'));
      sv.setScalar(f.scale);
      ferns.setMatrixAt(i, m.compose(f.pos, q, sv));
    }
    ferns.instanceMatrix.needsUpdate = true;

    // Flowers nod.
    for (let i = 0; i < flowerBase.length; i++) {
      const f = flowerBase[i]!;
      q.setFromEuler(new THREE.Euler(f.tilt.x + Math.sin(t * 1.3 + f.phase) * 0.08, f.tilt.y, f.tilt.z));
      sv.setScalar(f.s);
      m.compose(f.pos, q, sv);
      petals.setMatrixAt(i, m);
      centers.setMatrixAt(i, m);
    }
    petals.instanceMatrix.needsUpdate = true;
    centers.instanceMatrix.needsUpdate = true;

    // Seeds helicopter down; leaves tumble. Both respawn above when they land.
    for (let i = 0; i < seedState.length; i++) {
      const s = seedState[i]!;
      s.pos.y -= s.fall * dt;
      s.pos.x += Math.sin(t * 0.6 + s.phase) * s.drift * dt + 0.08 * dt;
      if (s.pos.y < -0.2 || s.pos.x > 9) seedState[i] = spawn({}, true);
      q.setFromEuler(new THREE.Euler(0.35, t * s.spin + s.phase, 0.2, 'XYZ'));
      seeds.setMatrixAt(i, m.compose(s.pos, q, sv.setScalar(1)));
    }
    seeds.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < leafState.length; i++) {
      const s = leafState[i]!;
      s.pos.y -= s.fall * dt * (0.7 + 0.3 * Math.sin(t * 1.7 + s.phase));
      s.pos.x += Math.sin(t * 0.8 + s.phase) * 0.6 * dt + 0.1 * dt;
      if (s.pos.y < -0.2 || s.pos.x > 9) leafState[i] = spawn({ fall: 0.35 + rand() * 0.2, spin: 1 + rand() }, true);
      q.setFromEuler(new THREE.Euler(s.rot.x + t * 0.9 * s.spin, s.rot.y + t * 0.5, s.rot.z + Math.sin(t * 1.4 + s.phase) * 0.8));
      leaves.setMatrixAt(i, m.compose(s.pos, q, sv.setScalar(1)));
    }
    leaves.instanceMatrix.needsUpdate = true;

    // Pollen drifts up and sideways in slow curls.
    const pa = pollenGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pCount; i++) {
      const k = pSeed[i]!;
      let y = pa.getY(i) + (0.05 + 0.04 * Math.sin(k)) * dt;
      if (y > 5.8) y = 0;
      pa.setXYZ(i, pa.getX(i) + Math.sin(t * 0.3 + k) * 0.08 * dt, y, pa.getZ(i) + Math.cos(t * 0.25 + k) * 0.06 * dt);
    }
    pa.needsUpdate = true;

    // Butterfly.
    if (rest > 0) {
      rest -= dt;
      fly.position.copy(landing);
      const open = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2));
      lPivot.rotation.z = open;
      rPivot.rotation.z = -open;
    } else {
      const before = fs;
      fs = (fs + dt * 0.045) % 1;
      if (fs < before) rest = 4.5; // wrapped past 0: back round to the flower, so sit a while
      flightPath.getPointAt(fs, fly.position);
      fly.position.y += Math.sin(t * 7) * 0.03;
      flightPath.getPointAt((fs + 0.01) % 1, look);
      fly.lookAt(look);
      const flap = Math.sin(t * 22) * 0.95;
      lPivot.rotation.z = flap;
      rPivot.rotation.z = -flap;
    }
    fly.up.copy(up);
  };

  const clock = new THREE.Clock();
  let active = true;
  let raf = 0;
  const loop = () => {
    raf = 0;
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    step(clock.elapsedTime, dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };

  if (opts.still) {
    rest = 1; // a still frame shows the butterfly on its flower
    step(12, 0);
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(loop);
  }

  return {
    setColors(c) {
      scene.fog = new THREE.Fog(c.fog, 7, 27);
      hemi.color.set(c.sky);
      hemi.groundColor.set(c.ground);
      rim.color.set(c.sky);
      mossMat.color.copy(misted(c.moss, c.fog, 0.12));
      groundMat.color.copy(misted(c.moss, c.fog, 0.3));
      fernMat.color.copy(misted(c.sap, c.fog, 0.1));
      leafMat.color.set(c.sap);
      petalMat.color.set(c.bloom);
      petalMat.emissive.set(c.bloom);
      centerMat.color.set(c.accent);
      seedMat.color.set(c.accent);
      wingMat.color.set(c.bloom);
      wingMat.emissive.set(c.accent);
      pollenMat.color.set(c.accent);
      if (opts.still) renderer.render(scene, camera);
    },
    setActive(on) {
      if (opts.still || on === active) return;
      active = on;
      if (on) {
        clock.getDelta(); // don't jump forward by the time spent paused
        if (!raf) raf = requestAnimationFrame(loop);
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener('pointermove', onPointer);
      for (const d of disposables) d.dispose();
      for (const im of [clumps, ferns, petals, centers, seeds, leaves]) im.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
