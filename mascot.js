/* The e-learning owl: a small three.js mascot built from primitives (no model file).
 * Follows the cursor, breathes, blinks, and hops when clicked. Colours come from tokens.css.
 * Two copies share one model: the big hero owl (#owlStage) and the mini owl in the corner dock (#owlMini).
 * Page events: hero dispatches "owl:poke" on click and listens for "owl:hop"; the mini owl listens for "owl:mini-hop". */
import * as THREE from "./vendor/three/three.module.min.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Resolve a CSS colour token (oklch) to an sRGB THREE.Color via a 1px canvas.
const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
function token(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

function mountOwl(stage, { mini = false } = {}) {
  if (!stage) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return; // no WebGL: the static SVG owl stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (mini) renderer.domElement.setAttribute("aria-hidden", "true");   // the dock button carries the label
  else {
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "The e-learning owl, wearing round glasses and standing on three subject books. Click it for a tip.");
  }
  stage.appendChild(renderer.domElement);
  stage.classList.add("has-3d");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // the mini owl is framed tight on head + body (no books)
  if (mini) { camera.position.set(0, 0.4, 7.2); camera.lookAt(0, 0.4, 0); }
  else { camera.position.set(0, 0.35, 8.2); camera.lookAt(0, 0.15, 0); }

  scene.add(new THREE.HemisphereLight(0xffffff, token("--color-paper-3"), 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);

  // Three-step toon ramp for a soft, hand-made look.
  const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 180, 180, 180, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const mat = name => new THREE.MeshToonMaterial({ color: token(name), gradientMap: ramp });
  const M = {
    body: mat("--color-owl-body"), wing: mat("--color-owl-wing"), belly: mat("--color-owl-belly"),
    face: mat("--color-owl-face"), eye: mat("--color-card"), ink: mat("--color-ink"),
    gold: mat("--color-action"), goldDeep: mat("--color-action-deep"),
    math: mat("--color-math"), eng: mat("--color-eng"), sci: mat("--color-sci"), page: mat("--color-card"),
    branch: mat("--color-branch"), leaf: mat("--color-leaf"), leaf2: mat("--color-leaf-2"),
  };
  const sphere = new THREE.SphereGeometry(1, 40, 28);
  const mesh = (geo, m, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    return o;
  };

  // ---- Build the owl ----
  const owl = new THREE.Group();          // hops + bobs
  const body = new THREE.Group();         // breathes, turns a little
  const head = new THREE.Group();         // follows the cursor
  owl.add(body);
  scene.add(owl);

  body.add(mesh(sphere, M.body, [0, 0, 0], [1, 1.12, 0.92]));
  body.add(mesh(sphere, M.belly, [0, -0.12, 0.42], [0.72, 0.84, 0.55]));
  // belly feather marks: small chevrons of darker cream
  for (const [x, y] of [[-0.22, 0.12], [0.22, 0.12], [0, -0.1], [-0.25, -0.34], [0.25, -0.34]]) {
    const v = mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI), M.face, [x, y, 0.93]);
    v.rotation.z = Math.PI;
    body.add(v);
  }

  const wings = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.86, 0.35, 0);
    const w = mesh(sphere, M.wing, [side * 0.12, -0.5, 0], [0.3, 0.72, 0.6]);
    w.rotation.z = side * 0.12;
    pivot.add(w);
    body.add(pivot);
    return pivot;
  });

  for (const side of [-1, 1]) for (const dx of [-0.1, 0, 0.1]) {
    body.add(mesh(sphere, M.gold, [side * 0.34 + dx, -1.1, 0.5], [0.075, 0.06, 0.13]));
  }

  head.position.set(0, 1.18, 0);
  body.add(head);
  head.add(mesh(sphere, M.body, [0, 0, 0], [0.98, 0.84, 0.88]));
  const eyes = [];
  for (const side of [-1, 1]) {
    head.add(mesh(sphere, M.face, [side * 0.33, 0.02, 0.62], [0.36, 0.36, 0.22]));
    const eye = new THREE.Group();
    eye.position.set(side * 0.33, 0.04, 0.74);
    eye.add(mesh(sphere, M.eye, [0, 0, 0], [0.24, 0.24, 0.12]));
    const pupil = new THREE.Group();
    pupil.add(mesh(sphere, M.ink, [0, 0, 0.09], [0.12, 0.12, 0.06]));
    pupil.add(mesh(sphere, M.eye, [0.04, 0.05, 0.14], [0.035, 0.035, 0.02]));   // catchlight
    eye.add(pupil);
    head.add(eye);
    eyes.push({ eye, pupil });
    // round study glasses
    head.add(mesh(new THREE.TorusGeometry(0.29, 0.03, 12, 48), M.ink, [side * 0.33, 0.04, 0.86]));
    // ear tufts
    const tuft = mesh(new THREE.ConeGeometry(0.16, 0.42, 20), M.wing, [side * 0.56, 0.68, -0.05]);
    tuft.rotation.z = -side * 0.5;
    head.add(tuft);
  }
  const bridge = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), M.ink, [0, 0.08, 0.9]);
  bridge.rotation.z = Math.PI / 2;
  head.add(bridge);
  const beak = mesh(new THREE.ConeGeometry(0.09, 0.24, 16), M.gold, [0, -0.2, 0.84]);
  beak.rotation.x = Math.PI + 0.35;
  head.add(beak);

  // Three subject books under its feet
  const books = new THREE.Group();
  books.position.y = -1.42;
  [[M.sci, 0.08, 0], [M.eng, -0.1, 0.2], [M.math, 0.05, 0.4]].forEach(([m, rot, y], i) => {
    const b = new THREE.Group();
    b.position.set(0, -y, 0);
    b.rotation.y = rot;
    b.add(mesh(new THREE.BoxGeometry(1.8 - i * 0.08, 0.2, 1.15), m));
    b.add(mesh(new THREE.BoxGeometry(1.7 - i * 0.08, 0.16, 1.05), M.page, [0.06, 0, 0.02]));
    books.add(b);
  });
  if (!mini) owl.add(books);

  // Mini owl perches on a small branch with leaves instead of books
  if (mini) {
    const perch = new THREE.Group();
    perch.position.set(0, -1.2, 0.35);
    perch.rotation.z = -0.06;
    perch.scale.set(0.8, 0.9, 0.9);   // keep both leafy ends inside the frame
    const limb = mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.4, 14), M.branch);
    limb.rotation.z = Math.PI / 2;
    perch.add(limb);
    const twig = mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.0, 10), M.branch, [1.55, 0.36, 0]);
    twig.rotation.z = -0.9;
    perch.add(twig);
    // leaf clusters: flattened ellipsoids, two greens
    const leaves = [
      [-2.15, 0.08, 0.1, 0.5, M.leaf], [-1.95, 0.3, -0.1, -0.4, M.leaf2], [-2.3, -0.2, 0.05, 1.2, M.leaf2],
      [1.95, 0.72, 0.05, -0.6, M.leaf], [2.1, 0.5, 0.15, 0.3, M.leaf2], [2.25, 0.02, 0, 1.0, M.leaf],
      [1.1, -0.18, 0.2, 2.4, M.leaf2],
    ];
    for (const [x, y, z, rot, m] of leaves) {
      const leaf = mesh(sphere, m, [x, y, z], [0.34, 0.14, 0.18]);
      leaf.rotation.set(0.3, 0.2, rot);
      perch.add(leaf);
    }
    owl.add(perch);
  }
  owl.position.y = mini ? -0.05 : 0.05;

  // Soft ground shadow under the books (radial canvas texture in the ink colour)
  const sc = document.createElement("canvas"); sc.width = sc.height = 128;
  const sg = sc.getContext("2d"), ink = token("--color-ink").getStyle();
  const grad = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, ink.replace("rgb(", "rgba(").replace(")", ",0.28)"));
  grad.addColorStop(1, ink.replace("rgb(", "rgba(").replace(")", ",0)"));
  sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.95;
  if (!mini) scene.add(shadow);

  // ---- Size ----
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (mini) { camera.updateProjectionMatrix(); renderer.render(scene, camera); return; }
    // keep the whole owl in frame on narrow stages
    camera.position.z = camera.aspect < 0.9 ? 8.2 / Math.max(camera.aspect, 0.55) * 0.9 : 8.2;
    // sit the owl right of centre so the speech bubble on the left never covers its face
    const shift = camera.aspect > 0.9 ? 0.85 : 0.6;
    owl.position.x = shadow.position.x = shift;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(stage);

  // ---- Input ----
  const target = { yaw: 0, pitch: 0 };
  let lastMove = -1e9;
  addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2);
    const ny = (e.clientY - (r.top + r.height * 0.35)) / (innerHeight / 2);
    target.yaw = THREE.MathUtils.clamp(nx * 0.7, -0.5, 0.5);
    target.pitch = THREE.MathUtils.clamp(ny * 0.45, -0.3, 0.35);
    lastMove = performance.now();
    if (reduceMotion) { head.rotation.set(target.pitch, target.yaw, 0); renderer.render(scene, camera); }
  }, { passive: true });

  let hopStart = -1e9;
  const hop = () => { hopStart = performance.now(); };
  addEventListener(mini ? "owl:mini-hop" : "owl:hop", hop);

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  if (!mini) renderer.domElement.addEventListener("click", e => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    if (ray.intersectObject(owl, true).length) {
      hop();
      dispatchEvent(new Event("owl:poke"));
    }
  });

  if (reduceMotion) { resize(); return; }

  // ---- Animate (only while on screen) ----
  let visible = true, nextBlink = 2500, blinkAt = -1;
  const dock = mini && stage.closest(".owl-dock");
  if (!mini) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);
  const yaw = { v: 0 }, pitch = { v: 0 };

  renderer.setAnimationLoop(t => {
    if (dock) visible = dock.classList.contains("show");
    if (!visible || document.hidden) return;
    // wander gently when the cursor has been still for a while
    const idle = t - lastMove > 4000;
    const ty = idle ? Math.sin(t / 2200) * 0.35 : target.yaw;
    const tp = idle ? Math.sin(t / 3100) * 0.08 : target.pitch;
    yaw.v += (ty - yaw.v) * 0.08;
    pitch.v += (tp - pitch.v) * 0.08;
    head.rotation.set(pitch.v, yaw.v, -yaw.v * 0.15);
    body.rotation.y = yaw.v * 0.25;
    for (const { pupil } of eyes) pupil.position.set(yaw.v * 0.07, -pitch.v * 0.08, 0);

    // breathe + bob
    body.scale.set(1, 1 + Math.sin(t / 700) * 0.015, 1);
    let y = (mini ? -0.05 : 0.05) + Math.sin(t / 900) * 0.03;

    // blink
    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2600 + Math.random() * 2600; }
    const b = t - blinkAt;
    const lid = b >= 0 && b < 160 ? 1 - Math.sin((b / 160) * Math.PI) * 0.92 : 1;
    for (const { eye } of eyes) eye.scale.y = lid;

    // hop + flap after a click
    const h = (t - hopStart) / 650;
    if (h >= 0 && h < 1) {
      y += Math.sin(h * Math.PI) * (mini ? 0.3 : 0.45);
      const flap = Math.sin(h * Math.PI * 4) * 0.9 * (1 - h);
      wings[0].rotation.z = -flap; wings[1].rotation.z = flap;
    } else {
      wings[0].rotation.z = wings[1].rotation.z = Math.sin(t / 900) * 0.03;
    }
    owl.position.y = y;
    renderer.render(scene, camera);
  });
}

mountOwl(document.getElementById("owlStage"));
mountOwl(document.getElementById("owlMini"), { mini: true });
