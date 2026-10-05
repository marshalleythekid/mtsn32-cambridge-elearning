/* The e-learning owl: a small three.js mascot built from primitives (no model file).
 * Follows the cursor, breathes, blinks, and hops when clicked. Colours come from tokens.css.
 * Two copies share one model: the big hero owl (#owlStage) and the mini owl in the corner dock (#owlMini).
 * Page events: hero dispatches "owl:poke" on click and listens for "owl:hop"; the mini owl listens for "owl:mini-hop". */
import * as THREE from "./vendor/three/three.module.min.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { damp, clamp } = THREE.MathUtils;

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

// ---- Shared by both owls: geometries and materials are built once ----
const G = {
  sphere: new THREE.SphereGeometry(1, 40, 28),
  lidUpper: new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),   // top half-shell
  chevron: new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI),
  glasses: new THREE.TorusGeometry(0.29, 0.03, 12, 48),
  tuft: new THREE.ConeGeometry(0.16, 0.42, 20),
  bridge: new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8),
  beak: new THREE.ConeGeometry(0.09, 0.24, 16),
  limb: new THREE.CylinderGeometry(0.1, 0.14, 4.4, 14),
  twig: new THREE.CylinderGeometry(0.04, 0.07, 1.0, 10),
};
// Four-step toon ramp: a little softer than three steps, still hand-drawn.
const ramp = new THREE.DataTexture(new Uint8Array([78, 78, 78, 255, 148, 148, 148, 255, 212, 212, 212, 255, 255, 255, 255, 255]), 4, 1);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const toon = name => new THREE.MeshToonMaterial({ color: token(name), gradientMap: ramp });
const M = {
  body: toon("--color-owl-body"), wing: toon("--color-owl-wing"), belly: toon("--color-owl-belly"),
  face: toon("--color-owl-face"), eye: toon("--color-card"), ink: toon("--color-ink"), gold: toon("--color-action"),
  math: toon("--color-math"), eng: toon("--color-eng"), sci: toon("--color-sci"), page: toon("--color-card"),
  branch: toon("--color-branch"), leaf: toon("--color-leaf"), leaf2: toon("--color-leaf-2"),
  // inverted-hull outline: back faces in navy, drawn slightly larger than each shape
  outline: new THREE.MeshBasicMaterial({ color: token("--color-ink"), side: THREE.BackSide }),
};

function mountOwl(stage, { mini = false } = {}) {
  if (!stage) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    return; // no WebGL: the static SVG owl stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  if (mini) canvas.setAttribute("aria-hidden", "true");   // the dock button carries the label
  else {
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "The e-learning owl, wearing round glasses and standing on three subject books. Click it for a tip.");
  }
  stage.appendChild(canvas);
  stage.classList.add("has-3d");
  // If the graphics card resets (older school PCs), fall back to the flat SVG owl instead of a blank box.
  canvas.addEventListener("webglcontextlost", e => {
    e.preventDefault();
    renderer.setAnimationLoop(null);
    canvas.style.display = "none";
    stage.classList.remove("has-3d");
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  if (mini) { camera.position.set(0, 0.4, 7.2); camera.lookAt(0, 0.4, 0); }
  else { camera.position.set(0, 0.35, 8.2); camera.lookAt(0, 0.15, 0); }

  scene.add(new THREE.HemisphereLight(0xffffff, token("--color-paper-3"), 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);   // from behind: lifts the edges off the background
  rim.position.set(-4, 3, -5);
  scene.add(rim);

  const line = mini ? 0.045 : 0.032;   // outline thickness in world units (thicker when small)
  const mesh = (geo, m, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], { outline = true, grow = null } = {}) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    if (outline) {
      const hull = new THREE.Mesh(geo, M.outline);
      // unit spheres grow by a fixed thickness; other shapes grow by a ratio
      if (grow) hull.scale.setScalar(grow); else hull.scale.set(1 + line / sx, 1 + line / sy, 1 + line / sz);
      hull.raycast = () => {};   // clicks hit the owl, not its outline
      o.add(hull);
    }
    return o;
  };

  // ---- Build the owl ----
  const owl = new THREE.Group();          // hops + bobs
  const body = new THREE.Group();         // breathes, turns a little
  const head = new THREE.Group();         // follows the cursor
  owl.add(body);
  scene.add(owl);

  body.add(mesh(G.sphere, M.body, [0, 0, 0], [1, 1.12, 0.92]));
  body.add(mesh(G.sphere, M.belly, [0, -0.12, 0.42], [0.72, 0.84, 0.55], { outline: false }));
  for (const [x, y] of [[-0.22, 0.12], [0.22, 0.12], [0, -0.1], [-0.25, -0.34], [0.25, -0.34]]) {
    const v = mesh(G.chevron, M.face, [x, y, 0.93], undefined, { outline: false });
    v.rotation.z = Math.PI;
    body.add(v);
  }

  const wings = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.86, 0.35, 0);
    const w = mesh(G.sphere, M.wing, [side * 0.12, -0.5, 0], [0.3, 0.72, 0.6]);
    w.rotation.z = side * 0.12;
    pivot.add(w);
    body.add(pivot);
    return pivot;
  });

  for (const side of [-1, 1]) for (const dx of [-0.1, 0, 0.1]) {
    body.add(mesh(G.sphere, M.gold, [side * 0.34 + dx, -1.1, 0.5], [0.075, 0.06, 0.13], { outline: false }));
  }

  head.position.set(0, 1.18, 0);
  body.add(head);
  head.add(mesh(G.sphere, M.body, [0, 0, 0], [0.98, 0.84, 0.88]));
  const eyes = [];
  for (const side of [-1, 1]) {
    head.add(mesh(G.sphere, M.face, [side * 0.33, 0.02, 0.66], [0.36, 0.36, 0.24], { outline: false }));
    const eye = new THREE.Group();
    eye.position.set(side * 0.33, 0.04, 0.82);   // far enough forward that the whole eye shows, not a crescent
    eye.add(mesh(G.sphere, M.eye, [0, 0, 0], [0.24, 0.24, 0.12], { outline: false }));
    const pupil = new THREE.Group();
    pupil.add(mesh(G.sphere, M.ink, [0, 0, 0.09], [0.12, 0.12, 0.06], { outline: false }));
    pupil.add(mesh(G.sphere, M.eye, [0.04, 0.05, 0.14], [0.035, 0.035, 0.02], { outline: false }));   // catchlight
    eye.add(pupil);
    // eyelids: two half-shells in the feather colour that rotate shut over the eye
    const upper = mesh(G.lidUpper, M.body, [0, 0, 0], [0.255, 0.255, 0.2], { outline: false });
    const lower = mesh(G.lidUpper, M.face, [0, 0, 0], [0.255, 0.255, 0.2], { outline: false });
    eye.add(upper, lower);
    head.add(eye);
    eyes.push({ pupil, upper, lower });
    head.add(mesh(G.glasses, M.ink, [side * 0.33, 0.04, 0.97], undefined, { outline: false }));   // round study glasses
    const tuft = mesh(G.tuft, M.wing, [side * 0.56, 0.68, -0.05], undefined, { grow: 1.1 });   // ear tufts
    tuft.rotation.z = -side * 0.5;
    head.add(tuft);
  }
  const bridge = mesh(G.bridge, M.ink, [0, 0.08, 1.0], undefined, { outline: false });
  bridge.rotation.z = Math.PI / 2;
  head.add(bridge);
  const beak = mesh(G.beak, M.gold, [0, -0.2, 0.9], undefined, { grow: 1.14 });
  beak.rotation.x = Math.PI + 0.35;
  head.add(beak);

  // Eyelid pose: 0 = open, 1 = shut. Upper lid swings down from behind; lower lid swings up.
  function lids(upperShut, lowerShut) {
    for (const { upper, lower } of eyes) {
      upper.rotation.x = -(Math.PI / 2) * (1 - upperShut);
      lower.rotation.x = Math.PI + (Math.PI / 2) * (1 - lowerShut);
    }
  }
  lids(0, 0);

  // Three subject books under the hero owl's feet
  if (!mini) {
    const books = new THREE.Group();
    books.position.y = -1.42;
    [[M.sci, 0.08, 0], [M.eng, -0.1, 0.2], [M.math, 0.05, 0.4]].forEach(([m, rot, y], i) => {
      const b = new THREE.Group();
      b.position.set(0, -y, 0);
      b.rotation.y = rot;
      b.add(mesh(new THREE.BoxGeometry(1.8 - i * 0.08, 0.2, 1.15), m, undefined, undefined, { grow: 1.03 }));
      b.add(mesh(new THREE.BoxGeometry(1.7 - i * 0.08, 0.16, 1.05), M.page, [0.06, 0, 0.02], undefined, { outline: false }));
      books.add(b);
    });
    owl.add(books);
  }

  // The mini owl perches on a small branch with leaves instead
  if (mini) {
    const perch = new THREE.Group();
    perch.position.set(0, -1.2, 0.35);
    perch.rotation.z = -0.06;
    perch.scale.set(0.8, 0.9, 0.9);   // keep both leafy ends inside the frame
    const limb = mesh(G.limb, M.branch, undefined, undefined, { grow: 1.12 });
    limb.rotation.z = Math.PI / 2;
    perch.add(limb);
    const twig = mesh(G.twig, M.branch, [1.55, 0.36, 0], undefined, { outline: false });
    twig.rotation.z = -0.9;
    perch.add(twig);
    const leaves = [
      [-2.15, 0.08, 0.1, 0.5, M.leaf], [-1.95, 0.3, -0.1, -0.4, M.leaf2], [-2.3, -0.2, 0.05, 1.2, M.leaf2],
      [1.95, 0.72, 0.05, -0.6, M.leaf], [2.1, 0.5, 0.15, 0.3, M.leaf2], [2.25, 0.02, 0, 1.0, M.leaf],
      [1.1, -0.18, 0.2, 2.4, M.leaf2],
    ];
    for (const [x, y, z, rot, m] of leaves) {
      const leaf = mesh(G.sphere, m, [x, y, z], [0.34, 0.14, 0.18]);
      leaf.rotation.set(0.3, 0.2, rot);
      perch.add(leaf);
    }
    owl.add(perch);
  }
  const restY = mini ? -0.05 : 0.05;
  owl.position.y = restY;

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
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!mini) {
      // keep the whole owl in frame on narrow stages, right of centre so the speech bubble never covers its face
      camera.position.z = camera.aspect < 0.9 ? 8.2 / Math.max(camera.aspect, 0.55) * 0.9 : 8.2;
      owl.position.x = shadow.position.x = camera.aspect > 0.9 ? 0.85 : 0.6;
    }
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
    target.yaw = clamp(nx * 0.7, -0.5, 0.5);
    target.pitch = clamp(ny * 0.45, -0.3, 0.35);
    lastMove = performance.now();
    if (reduceMotion) { head.rotation.set(target.pitch, target.yaw, 0); renderer.render(scene, camera); }
  }, { passive: true });

  let hopStart = -1e9;
  const hop = () => { hopStart = performance.now(); };
  addEventListener(mini ? "owl:mini-hop" : "owl:hop", hop);

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  if (!mini) canvas.addEventListener("click", e => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    if (ray.intersectObject(owl, true).length) {
      hop();
      dispatchEvent(new Event("owl:poke"));
    }
  });

  if (reduceMotion) { resize(); return; }

  // ---- Animate (only while on screen); easing uses real time, so it feels the same at 60 Hz and 144 Hz ----
  let visible = true, nextBlink = 2500, blinkAt = -1, prev = performance.now();
  const dock = mini && stage.closest(".owl-dock");
  if (!mini) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);
  let yaw = 0, pitch = 0;

  renderer.setAnimationLoop(t => {
    const dt = Math.min((t - prev) / 1000, 0.1);
    prev = t;
    if (dock) visible = dock.classList.contains("show");
    if (!visible || document.hidden) return;

    // look at the cursor, or wander gently when it has been still for a while
    const idle = t - lastMove > 4000;
    yaw = damp(yaw, idle ? Math.sin(t / 2200) * 0.35 : target.yaw, 5, dt);
    pitch = damp(pitch, idle ? Math.sin(t / 3100) * 0.08 : target.pitch, 5, dt);
    for (const { pupil } of eyes) pupil.position.set(yaw * 0.07, -pitch * 0.08, 0);

    // breathe + bob
    body.scale.set(1, 1 + Math.sin(t / 700) * 0.015, 1);
    let y = restY + Math.sin(t / 900) * 0.03;

    // hop after a click: jump, flap, tilt the head and smile with the eyes
    const h = (t - hopStart) / 650;
    const hopping = h >= 0 && h < 1;
    const joy = hopping ? Math.sin(h * Math.PI) : 0;
    if (hopping) {
      y += joy * (mini ? 0.3 : 0.45);
      const flap = Math.sin(h * Math.PI * 4) * 0.9 * (1 - h);
      wings[0].rotation.z = -flap; wings[1].rotation.z = flap;
    } else {
      wings[0].rotation.z = wings[1].rotation.z = Math.sin(t / 900) * 0.03;
    }
    head.rotation.set(pitch - joy * 0.08, yaw, -yaw * 0.15 + joy * 0.18);
    body.rotation.y = yaw * 0.25;

    // blink with real eyelids; a happy squint while hopping
    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2600 + Math.random() * 2600; }
    const b = t - blinkAt;
    const blink = b >= 0 && b < 170 ? Math.sin((b / 170) * Math.PI) : 0;
    lids(Math.max(blink, joy * 0.35), Math.max(blink * 0.6, joy * 0.8));

    owl.position.y = y;
    renderer.render(scene, camera);
  });
}

mountOwl(document.getElementById("owlStage"));
mountOwl(document.getElementById("owlMini"), { mini: true });
