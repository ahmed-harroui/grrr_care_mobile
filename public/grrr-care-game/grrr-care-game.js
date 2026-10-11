/*! GRRR Care — mini-jeu "planète" (three.js r149). API : GrrrCareGame.mount(container, options). Voir INTEGRATION.md */
(function (global) {
"use strict";
const VERSION = "1.0.0";
const SCRIPT_BASE = (function () { try { const s = document.currentScript && document.currentScript.src; return s ? s.slice(0, s.lastIndexOf("/") + 1) : ""; } catch (e) { return ""; } })();
const CSS = `.gcg{position:relative;width:100%;height:100%;overflow:hidden;background:#5fbcff;font-family:"GcgInter",system-ui,sans-serif;font-weight:700;color:#0f1b3d;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}.gcg *{box-sizing:border-box;margin:0;padding:0}.gcg canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}.gcg button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}.gcg h1,.gcg b,.gcg-btn,.gcg-q,.gcg-ok,.gcg-badge span{font-family:"GcgBric","GcgInter",system-ui,sans-serif;font-weight:800;letter-spacing:-.02em}.gcg-hud{position:absolute;left:0;right:0;top:0;padding:max(12px,env(safe-area-inset-top)) 12px 0;opacity:0;transform:translateY(-12px);transition:.35s;pointer-events:none}.gcg-hud.gcg-show{opacity:1;transform:none}.gcg-top{display:flex;gap:8px;align-items:center;justify-content:center;max-width:560px;margin:0 auto}.gcg-pill{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 6px 18px rgba(15,27,61,.16);font-size:15px;pointer-events:auto;white-space:nowrap}.gcg-health{flex:1;min-width:0}.gcg-health span{font-size:12px;color:#5a6785;overflow:hidden;text-overflow:ellipsis}.gcg-bar{flex:1;height:8px;min-width:30px;border-radius:9px;background:#e3e9f5;overflow:hidden}.gcg-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#16a37f,#5fd6c4);transition:width .4s}.gcg-dot{width:14px;height:14px;border-radius:50%;background:#c98a5e;box-shadow:inset -3px -3px 0 rgba(0,0,0,.15)}.gcg-mute{width:40px;justify-content:center;padding:0;font-size:18px}.gcg-mute.gcg-off{opacity:.45;text-decoration:line-through}.gcg-badges{position:absolute;inset:0;pointer-events:none}.gcg-badge{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;background:#ff4d4d!important;color:#fff!important;font-size:28px;display:none;align-items:center;justify-content:center;pointer-events:auto;box-shadow:0 8px 20px rgba(255,77,77,.45);will-change:transform}.gcg-badge.gcg-on{display:flex}.gcg-badge span{animation:gcg-bob 1s ease-in-out infinite}.gcg-badge svg{position:absolute;inset:-5px;width:62px;height:62px;transform:rotate(-90deg)}.gcg-ring-bg{fill:none;stroke:rgba(255,255,255,.55);stroke-width:4}.gcg-ring{fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:calc(100 - var(--p,100))}.gcg-badge.gcg-urgent{animation:gcg-pulse .5s ease-in-out infinite}.gcg-arrow{position:absolute;top:42%;height:48px;padding:0 14px;background:#ff4d4d!important;color:#fff!important;font-size:22px;font-weight:800;display:none;align-items:center;box-shadow:0 8px 20px rgba(255,77,77,.4);animation:gcg-nudge 1s ease-in-out infinite}.gcg-arrow.gcg-on{display:flex}.gcg-left{left:0;border-radius:0 999px 999px 0}.gcg-right{right:0;border-radius:999px 0 0 999px}.gcg-toast{position:absolute;left:50%;top:76px;transform:translate(-50%,-10px);max-width:86%;padding:10px 18px;border-radius:999px;background:rgba(15,27,61,.88);color:#fff;font-size:14px;text-align:center;opacity:0;transition:.3s;pointer-events:none}.gcg-toast.gcg-on{opacity:1;transform:translate(-50%,0)}.gcg-toast.gcg-good{background:#16a37f}.gcg-sheet{position:absolute;left:50%;bottom:0;width:min(100%,520px);transform:translate(-50%,105%);transition:transform .38s cubic-bezier(.2,.9,.25,1);background:#fff;border-radius:28px 28px 0 0;padding:20px 18px max(18px,env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(15,27,61,.22);display:flex;flex-direction:column;gap:12px}.gcg-sheet.gcg-show{transform:translate(-50%,0)}.gcg-x{position:absolute;right:12px;top:10px;width:36px;height:36px;border-radius:50%;background:#eef2fa!important;font-size:22px;line-height:1}.gcg-q{align-self:flex-end;max-width:82%;margin-right:38px;padding:11px 16px;border-radius:20px 20px 6px 20px;background:linear-gradient(135deg,#2563eb,#4f9dff);color:#fff;font-size:17px}.gcg-a{display:flex;gap:10px;align-items:flex-start}.gcg-a small{display:block;font-size:11px;letter-spacing:.08em;color:#2563eb;text-transform:uppercase}.gcg-a p{font-size:15px;line-height:1.3;margin-top:2px}.gcg-tok{flex:none;width:38px;height:38px;border-radius:12px;transform:rotate(45deg);margin:4px 6px 0 4px;background:linear-gradient(135deg,#2f6bff,#5b9bff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 14px rgba(37,99,235,.4)}.gcg-tok svg{transform:rotate(-45deg)}.gcg-opts{display:flex;flex-direction:column;gap:8px}.gcg-opt{min-height:50px;padding:10px 16px;border-radius:16px;background:#f2f5fb!important;border:2px solid #dfe6f3!important;font-size:16px;text-align:left;transition:.15s}.gcg-opt:active{transform:scale(.98);border-color:#2563eb!important}.gcg-opt.gcg-wrong{background:#ffecec!important;border-color:#ffb3b3!important;color:#b23b3b!important;text-decoration:line-through;animation:gcg-shake .3s}.gcg-ok{font-size:22px;color:#16a37f}.gcg-ok em{font-style:normal;font-size:15px;margin-left:8px;padding:3px 10px;border-radius:99px;background:#fff1dc;color:#b06a1e}.gcg-row{display:flex;gap:8px}.gcg-row .gcg-btn{flex:1}.gcg-btn{min-height:50px;padding:0 22px;border-radius:999px;background:#2563eb!important;color:#fff!important;font-size:17px;box-shadow:0 8px 20px rgba(37,99,235,.35)}.gcg-btn.gcg-ghost{background:#eef3ff!important;color:#2563eb!important;box-shadow:none}.gcg-card{position:absolute;left:50%;top:50%;width:min(88%,380px);transform:translate(-50%,-46%) scale(.94);opacity:0;pointer-events:none;transition:.35s;background:rgba(255,255,255,.95);border-radius:28px;padding:26px 22px 22px;text-align:center;box-shadow:0 24px 60px rgba(15,27,61,.28);display:flex;flex-direction:column;gap:12px;align-items:stretch}.gcg-card.gcg-show{opacity:1;transform:translate(-50%,-50%);pointer-events:auto}.gcg-card h1{font-size:34px;line-height:1}.gcg-card p{font-size:14px;line-height:1.35;color:#5a6785}.gcg-card .gcg-tag{font-size:16px;color:#0f1b3d}.gcg-logo{align-self:center;width:58px;height:58px;border-radius:18px;transform:rotate(45deg);margin:6px 0 10px;background:linear-gradient(135deg,#2f6bff,#5b9bff);color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(37,99,235,.4)}.gcg-logo svg{transform:rotate(-45deg)}.gcg-stats{display:flex;gap:8px}.gcg-stats div{flex:1;padding:12px 4px;border-radius:16px;background:#f2f5fb}.gcg-stats b{display:block;font-size:26px}.gcg-stats span{font-size:11px;color:#5a6785}@keyframes gcg-bob{50%{transform:translateY(-3px)}}@keyframes gcg-pulse{50%{box-shadow:0 0 0 10px rgba(255,77,77,.25)}}@keyframes gcg-nudge{50%{filter:brightness(1.15)}}@keyframes gcg-shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@media (prefers-reduced-motion:reduce){.gcg *{animation:none!important}}`;
function injectCss(base) { if (document.getElementById("gcg-style")) return; const st = document.createElement("style"); st.id = "gcg-style";
  st.textContent = `@font-face{font-family:"GcgBric";src:url("${base}fonts/BricolageGrotesque-800.woff2") format("woff2");font-weight:800;font-display:swap}@font-face{font-family:"GcgInter";src:url("${base}fonts/Inter-700.woff2") format("woff2");font-weight:700;font-display:swap}` + CSS; document.head.appendChild(st); }
function mount(container, opts) {
  opts = opts || {}; const THREE = opts.THREE || global.THREE; if (!THREE) throw new Error("GrrrCareGame: THREE (r149) introuvable. Charge three.min.js avant, ou passe options.THREE.");
  if (typeof container === "string") container = document.querySelector(container); if (!container) throw new Error("GrrrCareGame: conteneur introuvable.");
  injectCss(opts.assetBase === undefined ? SCRIPT_BASE : opts.assetBase);
  const root = document.createElement("div"); root.className = "gcg"; const canvas = document.createElement("canvas"); root.appendChild(canvas); container.appendChild(root);
const R = 9, D2R = Math.PI / 180;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, x) => sm((x - a) / (b - a));
let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// keyframes: [[t, v...], ...] ; smooth per segment
function K(keys, t) { if (t <= keys[0][0]) return keys[0].slice(1); const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1].slice(1); let i = 0; while (keys[i + 1][0] < t) i++; const a = keys[i], b = keys[i + 1], u = sm((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, k) => lerp(v, b[k + 1], u)); }
const K1 = (keys, t) => K(keys, t)[0];
function KL(keys, t) { if (t <= keys[0][0]) return keys[0][1]; const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1][1]; let i = 0; while (keys[i + 1][0] < t) i++; const a = keys[i], b = keys[i + 1]; return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0])); }

// ---------- renderer ----------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality !== "low", powerPreference: "high-performance" });
renderer.shadowMap.enabled = opts.quality !== "low"; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1080 / 1920, 0.1, 1200);
const mats = {};
const M = (c, o) => { const k = c + JSON.stringify(o || {}); if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9, metalness: 0 }, o || {})); return mats[k]; };
const mk = (geo, mat) => { const m = new THREE.Mesh(geo, typeof mat === "string" ? M(mat) : mat); m.castShadow = true; m.receiveShadow = true; return m; };
const box = (w, h, d, c) => mk(new THREE.BoxGeometry(w, h, d), c);
const cyl = (rt, rb, h, c, s) => mk(new THREE.CylinderGeometry(rt, rb, h, s || 10), c);
const sph = (r, c, a, b) => mk(new THREE.SphereGeometry(r, a || 12, b || 9), c);
const ico = (r, c, d) => mk(new THREE.IcosahedronGeometry(r, d || 0), c);
const cone = (r, h, c, s) => mk(new THREE.ConeGeometry(r, h, s || 7), c);
const capsule = (r, l, c) => mk(new THREE.CapsuleGeometry(r, l, 5, 10), c);
const at = (m, x, y, z, rx, ry, rz) => { m.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
const grp = (...ch) => { const g = new THREE.Group(); ch.forEach((c) => g.add(c)); return g; };

// glow materials driven by night amount
const lampMat = new THREE.MeshStandardMaterial({ color: "#fff3d0", emissive: "#ffd58a", emissiveIntensity: 0, flatShading: true });
const winMat = new THREE.MeshStandardMaterial({ color: "#bfe3ff", emissive: "#ffc85a", emissiveIntensity: 0, flatShading: true });
const fireMat = new THREE.MeshStandardMaterial({ color: "#ff9a3a", emissive: "#ff7a1a", emissiveIntensity: 1, flatShading: true });

const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.35, flatShading: true });
// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color("#6ec3ff") }, bot: { value: new THREE.Color("#dff3ff") } },
  vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = smoothstep(-0.25, 0.75, vP.y); gl_FragColor = vec4(mix(bot, top, h), 1.0); }" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), skyMat); scene.add(sky);
const starGeo = new THREE.BufferGeometry(); { const p = []; for (let i = 0; i < 520; i++) { const v = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(420); p.push(v.x, v.y, v.z); } starGeo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); }
const starMat = new THREE.PointsMaterial({ color: "#ffffff", size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
scene.add(new THREE.Points(starGeo, starMat));
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 14), new THREE.MeshBasicMaterial({ color: "#ffe07a" })); scene.add(sunDisc);
const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 14), new THREE.MeshBasicMaterial({ color: "#ffe9a0", transparent: true, opacity: 0.25, depthWrite: false })); scene.add(sunHalo);
const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: "#fff6d8", transparent: true, opacity: 0 })); moon.position.set(-70, 150, -200); scene.add(moon);
const hemi = new THREE.HemisphereLight("#ffffff", "#5a8a5a", 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff6e0", 1.05); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 80 }); sun.shadow.bias = -0.0015; scene.add(sun); scene.add(sun.target);
const lantern = new THREE.PointLight("#ffc87a", 0, 9, 2); scene.add(lantern);
const fill = new THREE.DirectionalLight("#ffeedd", 0.12); fill.position.set(3, 16, 14); scene.add(fill); scene.add(fill.target); fill.target.position.set(0, R, 0);
const glowA = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffe3a0" })), glowB = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10), new THREE.MeshBasicMaterial({ color: "#ffd58a", transparent: true, opacity: 0.2, depthWrite: false })); scene.add(glowA, glowB);
const porch = new THREE.PointLight("#ffc06a", 0, 10, 2);

// ---------- planet ----------
const planet = new THREE.Group(); scene.add(planet);
const C = (h) => new THREE.Color(h);
const COL = { grass: C("#7cc47f"), park: C("#8fd68a"), wood: C("#6bb27a"), side: C("#d9d3ca"), stone: C("#e6dccb"), dirt: C("#e3c79b"), road: C("#8b93a3"), sand: C("#f3dfae"), water: C("#2fa6ea"), deep: C("#1f84d0"), shallow: C("#8fe2f4") };
function zoneColor(a, zu, lat) {
  const inR = (x, lo, hi) => x >= lo && x < hi;
  if (lat < -55) return COL.deep;
  if (inR(a, 163, 242)) { if (zu < -1.9) return zu < -4.2 ? COL.deep : COL.water; if (zu < -1.25) return COL.shallow; }
  if (inR(a, 168, 237) && zu < 2.8 && zu >= -1.25) return COL.sand;
  if (Math.abs(zu) < 0.72) { if (inR(a, 8, 58)) return COL.side; if (a >= 350 || a < 8) return COL.stone; return COL.dirt; }
  if (inR(a, 8, 58) && zu >= 0.72 && zu < 2.7) return COL.road;
  if (inR(a, 58, 150)) return COL.park;
  if (inR(a, 242, 350)) return COL.wood;
  return COL.grass;
}
{ const g = new THREE.IcosahedronGeometry(R, 34); const p = g.attributes.position, col = new Float32Array(p.count * 3), c = V3(), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) { c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(V3(p.getX(i + k), p.getY(i + k), p.getZ(i + k))); c.multiplyScalar(1 / 3);
    let a = Math.atan2(c.x, c.y) / D2R; if (a < 0) a += 360; const lat = Math.asin(clamp(c.z / R, -1, 1)); const base = zoneColor(a, lat * R, lat / D2R); const v = 0.95 + rnd() * 0.1; tmp.copy(base).multiplyScalar(v);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = tmp.r; col[(i + k) * 3 + 1] = tmp.g; col[(i + k) * 3 + 2] = tmp.b; } }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })); m.receiveShadow = true; planet.add(m); }
// orientation on the sphere: a = degrees along the path, zu = sideways units (+ toward camera), yaw degrees
const qz = new THREE.Quaternion(), qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), AX = V3(1, 0, 0), AY = V3(0, 1, 0), AZ = V3(0, 0, 1);
function surf(obj, aRad, latRad, yawRad, h) { qz.setFromAxisAngle(AZ, -aRad); qx.setFromAxisAngle(AX, latRad); qy.setFromAxisAngle(AY, yawRad || 0); obj.quaternion.copy(qz).multiply(qx).multiply(qy); obj.position.set(0, R + (h || 0), 0).applyQuaternion(qz.clone().multiply(qx)); return obj; }
const P = (obj, a, zu, yaw, s, h) => { surf(obj, a * D2R, zu / R, (yaw || 0) * D2R, h || 0); if (s) obj.scale.setScalar(s); planet.add(obj); return obj; };

// ---------- props ----------
const GREENS = ["#4f9d69", "#5fb07a", "#3f8f58", "#6cbb85"];
function tree(k) { const g = grp(at(cyl(0.1, 0.15, 0.9, "#8a5a36", 7), 0, 0.45, 0)); const c = GREENS[k % 4], c2 = GREENS[(k + 1) % 4]; g.add(at(ico(0.62, c, 1), 0, 1.25, 0)); g.add(at(ico(0.45, c2, 1), 0.32, 1.0, 0.18)); g.add(at(ico(0.42, c2, 1), -0.3, 1.05, -0.12)); g.add(at(ico(0.4, c, 1), 0.05, 1.72, 0.05)); return g; }
function pine(k) { const c = ["#3f8f58", "#357a4c", "#4a9a62"][k % 3]; return grp(at(cyl(0.09, 0.13, 0.6, "#7a4e2e", 7), 0, 0.3, 0), at(cone(0.62, 0.9, c, 8), 0, 0.95, 0), at(cone(0.5, 0.8, c, 8), 0, 1.45, 0), at(cone(0.36, 0.7, c, 8), 0, 1.92, 0)); }
function palm() { const g = grp(at(cyl(0.1, 0.14, 0.9, "#b98455", 7), 0, 0.45, 0, 0, 0, 0.12), at(cyl(0.09, 0.1, 0.9, "#b98455", 7), -0.16, 1.3, 0, 0, 0, 0.25), at(cyl(0.08, 0.09, 0.8, "#b98455", 7), -0.4, 2.05, 0, 0, 0, 0.36)); for (let i = 0; i < 7; i++) { const l = grp(at(mk(new THREE.ConeGeometry(0.2, 1.3, 4), "#4f9d69"), 0.6, -0.12, 0, 0, 0, -Math.PI / 2 - 0.35)); l.scale.set(1, 1, 0.45); l.rotation.y = i * 0.898; l.position.set(-0.55, 2.45, 0); g.add(l); } g.add(at(sph(0.11, "#7a4e2e"), -0.5, 2.36, 0.1)); return g; }
function house(wall, roof, w, h, d, o) { o = o || {}; const g = grp(at(box(w, h, d, wall), 0, h / 2, 0)); const rf = at(cone(w * 0.8, 1.15, roof, 4), 0, h + 0.57, 0, 0, Math.PI / 4, 0); rf.scale.z = d / w * 1.05; g.add(rf);
  g.add(at(box(0.3, 0.7, 0.3, "#c98a5e"), w * 0.26, h + 0.75, -0.2)); g.add(at(box(0.7, 1.2, 0.06, "#4a2e1a"), o.doorX || 0, 0.6, d / 2 + 0.005));
  const dp = new THREE.Group(); dp.position.set((o.doorX || 0) - 0.32, 0, d / 2 + 0.05); dp.add(at(box(0.64, 1.14, 0.07, o.door || "#ff7a59"), 0.32, 0.57, 0)); dp.add(at(sph(0.045, "#ffd58a"), 0.54, 0.57, 0.06)); g.add(dp); g.userData.door = dp;
  [-1, 1].forEach((s) => { if (o.doorX && s * o.doorX > 0) return; const x = o.doorX ? s * w * 0.22 : s * w * 0.3; g.add(at(box(0.56, 0.56, 0.05, "#fffaf2"), x, h * 0.62, d / 2 + 0.01)); g.add(at(mk(new THREE.BoxGeometry(0.44, 0.44, 0.06), winMat), x, h * 0.62, d / 2 + 0.02)); });
  g.add(at(box(0.9, 0.06, 0.45, "#d9d3ca"), o.doorX || 0, 0.03, d / 2 + 0.25)); return g; }
function lampPost() { return grp(at(cyl(0.045, 0.07, 2.3, "#3b4a6b", 7), 0, 1.15, 0), at(box(0.07, 0.07, 0.5, "#3b4a6b"), 0, 2.28, 0.2), at(mk(new THREE.SphereGeometry(0.17, 10, 8), lampMat), 0, 2.16, 0.42), at(cone(0.24, 0.16, "#3b4a6b", 8), 0, 2.36, 0.42)); }
function fence(n) { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(at(box(0.12, 0.62, 0.06, "#fffaf2"), i * 0.3, 0.31, 0)); g.add(at(box(n * 0.3, 0.08, 0.05, "#f3e6d2"), (n - 1) * 0.15, 0.42, 0)); g.add(at(box(n * 0.3, 0.08, 0.05, "#f3e6d2"), (n - 1) * 0.15, 0.2, 0)); return g; }
function hydrant() { return grp(at(cyl(0.15, 0.17, 0.5, "#ff4d3a", 9), 0, 0.25, 0), at(sph(0.16, "#ff4d3a"), 0, 0.52, 0), at(cyl(0.2, 0.2, 0.06, "#e03a2a", 9), 0, 0.05, 0), at(cyl(0.06, 0.06, 0.42, "#e03a2a", 7), 0, 0.32, 0, Math.PI / 2, 0, 0), at(cyl(0.05, 0.05, 0.1, "#ffd58a", 7), 0, 0.68, 0)); }
function bench() { return grp(at(box(1.2, 0.08, 0.42, "#c98a5e"), 0, 0.45, 0), at(box(1.2, 0.4, 0.07, "#c98a5e"), 0, 0.78, -0.2), at(box(0.08, 0.45, 0.4, "#3b4a6b"), -0.5, 0.22, 0), at(box(0.08, 0.45, 0.4, "#3b4a6b"), 0.5, 0.22, 0)); }
function mailbox() { return grp(at(cyl(0.04, 0.04, 0.9, "#8a5a36", 6), 0, 0.45, 0), at(box(0.42, 0.26, 0.24, "#ff5a36"), 0, 0.98, 0), at(box(0.04, 0.2, 0.02, "#ffd58a"), 0.18, 1.14, 0.13)); }
function bush(k) { return grp(at(ico(0.36, GREENS[k % 4], 1), 0, 0.26, 0), at(ico(0.28, GREENS[(k + 2) % 4], 1), 0.3, 0.2, 0.08)); }
function flower(c) { return grp(at(cyl(0.02, 0.02, 0.3, "#3f8f58", 5), 0, 0.15, 0), at(sph(0.09, c, 7, 5), 0, 0.34, 0), at(sph(0.045, "#ffd24a", 6, 4), 0, 0.41, 0)); }
function rock(s) { const r = ico(0.3, "#a9b0bd", 0); r.scale.set(1.3 * s, 0.8 * s, s); r.position.y = 0.14 * s; return grp(r); }
function car(c) { const g = grp(at(box(1.5, 0.42, 0.78, c), 0, 0.42, 0), at(box(0.8, 0.36, 0.7, "#fffaf2"), -0.08, 0.8, 0), at(mk(new THREE.BoxGeometry(0.74, 0.26, 0.72), winMat), -0.08, 0.8, 0)); [[-0.48, 0.34], [0.48, 0.34], [-0.48, -0.34], [0.48, -0.34]].forEach((p) => g.add(at(cyl(0.18, 0.18, 0.14, "#2b2f3a", 10), p[0], 0.18, p[1], Math.PI / 2, 0, 0))); g.add(at(mk(new THREE.SphereGeometry(0.07, 8, 6), lampMat), 0.76, 0.46, 0.25)); g.add(at(mk(new THREE.SphereGeometry(0.07, 8, 6), lampMat), 0.76, 0.46, -0.25)); return g; }
function gate() { return grp(at(cyl(0.12, 0.14, 2.6, "#c98a5e", 8), 0, 1.3, -1.25), at(cyl(0.12, 0.14, 2.6, "#c98a5e", 8), 0, 1.3, 1.25), at(box(0.18, 0.5, 3.0, "#ff8a66"), 0, 2.75, 0), at(box(0.2, 0.14, 3.2, "#e2553a"), 0, 3.05, 0), at(sph(0.2, "#ffd58a"), 0, 2.75, 1.25), at(sph(0.2, "#ffd58a"), 0, 2.75, -1.25)); }
function pond() { const g = grp(at(mk(new THREE.CylinderGeometry(1.5, 1.5, 0.05, 18), M("#5cc0e8", { roughness: 0.3 })), 0, 0.03, 0), at(cyl(1.62, 1.62, 0.03, "#d9cfa8", 18), 0, 0.012, 0)); g.userData.ducks = []; for (let i = 0; i < 3; i++) { const d = grp(at(sph(0.14, "#fffaf2", 8, 6), 0, 0.1, 0), at(sph(0.09, "#fffaf2", 8, 6), 0.12, 0.2, 0), at(cone(0.04, 0.1, "#ffa23a", 5), 0.23, 0.2, 0, 0, 0, -Math.PI / 2)); g.add(d); g.userData.ducks.push(d); } return g; }
function blanket() { const g = grp(at(box(1.3, 0.03, 1.0, "#ff5a36"), 0, 0.02, 0)); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) g.add(at(box(0.32, 0.035, 0.33, "#fffaf2"), -0.49 + i * 0.325, 0.022, -0.335 + j * 0.335)); g.add(at(box(0.3, 0.22, 0.22, "#c98a5e"), 0.2, 0.14, 0.1)); g.add(at(sph(0.09, "#ff4d3a", 8, 6), -0.3, 0.12, -0.15)); return g; }
function umbrella() { const g = grp(at(cyl(0.03, 0.03, 1.7, "#fffaf2", 6), 0, 0.85, 0, 0, 0, 0.12)); const top = at(cone(0.95, 0.42, "#ff7a59", 8), -0.1, 1.72, 0, 0, 0, 0.12); g.add(top); g.add(at(box(1.2, 0.03, 0.6, "#4fb3d9"), 0.4, 0.02, 0.2)); return g; }
function sandcastle() { return grp(at(cyl(0.3, 0.36, 0.3, "#e8cf93", 8), 0, 0.15, 0), at(cyl(0.12, 0.14, 0.34, "#e8cf93", 7), -0.22, 0.42, 0), at(cyl(0.12, 0.14, 0.34, "#e8cf93", 7), 0.22, 0.42, 0), at(cone(0.15, 0.2, "#ff7a59", 7), -0.22, 0.68, 0), at(cone(0.15, 0.2, "#ff7a59", 7), 0.22, 0.68, 0)); }
function pier() { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { g.add(at(box(1.0, 0.07, 0.3, i % 2 ? "#c98a5e" : "#b97d4f"), 0, 0.42, -i * 0.34)); if (i % 3 === 0) { g.add(at(cyl(0.06, 0.06, 0.9, "#7a4e2e", 6), -0.45, 0.2, -i * 0.34)); g.add(at(cyl(0.06, 0.06, 0.9, "#7a4e2e", 6), 0.45, 0.2, -i * 0.34)); } } return g; }
function lighthouse() { return grp(at(ico(0.9, "#a9b0bd", 0), 0, 0.1, 0), at(cyl(0.42, 0.6, 2.6, "#fffaf2", 10), 0, 1.6, 0), at(cyl(0.5, 0.56, 0.5, "#ff5a36", 10), 0, 1.0, 0), at(cyl(0.44, 0.47, 0.5, "#ff5a36", 10), 0, 2.2, 0), at(mk(new THREE.CylinderGeometry(0.34, 0.34, 0.4, 10), lampMat), 0, 3.1, 0), at(cone(0.48, 0.42, "#ff5a36", 10), 0, 3.5, 0)); }
function boat(c) { const g = grp(at(box(0.9, 0.22, 0.4, c), 0, 0.11, 0), at(cyl(0.025, 0.025, 0.9, "#7a4e2e", 5), 0, 0.6, 0)); const s = mk(new THREE.ConeGeometry(0.34, 0.75, 3), "#fffaf2"); s.scale.z = 0.12; at(s, 0.1, 0.68, 0); g.add(s); return g; }
function tent() { const g = grp(at(cone(0.95, 1.1, "#ff9a3a", 4), 0, 0.55, 0, 0, Math.PI / 4, 0), at(box(0.4, 0.6, 0.05, "#7a3e1a"), 0, 0.3, 0.66)); const f = grp(at(cyl(0.05, 0.05, 0.5, "#7a4e2e", 5), 0, 0.05, 0, 0, 0, Math.PI / 2), at(cyl(0.05, 0.05, 0.5, "#7a4e2e", 5), 0, 0.05, 0, Math.PI / 2, 0, 0), at(mk(new THREE.ConeGeometry(0.16, 0.42, 6), fireMat), 0, 0.3, 0)); f.position.set(0.2, 0, 1.5); g.add(f); g.userData.fire = f.children[2]; return g; }
function cloud(s) { const g = grp(at(sph(0.9, "#ffffff", 9, 7), 0, 0, 0), at(sph(0.7, "#ffffff", 9, 7), 0.9, -0.1, 0.1), at(sph(0.6, "#ffffff", 9, 7), -0.85, -0.15, -0.1), at(sph(0.55, "#ffffff", 9, 7), 0.3, 0.45, 0)); g.scale.set(s, s * 0.6, s * 0.8); g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.material = cloudMat; } }); return g; }
function balloon() { const g = grp(at(sph(0.9, "#ff7a59", 12, 9), 0, 1.6, 0), at(mk(new THREE.SphereGeometry(0.91, 12, 9, 0, 0.7), "#fffaf2"), 0, 1.6, 0), at(mk(new THREE.SphereGeometry(0.91, 12, 9, 2.1, 0.7), "#fffaf2"), 0, 1.6, 0), at(mk(new THREE.SphereGeometry(0.91, 12, 9, 4.2, 0.7), "#fffaf2"), 0, 1.6, 0), at(box(0.34, 0.26, 0.34, "#b97d4f"), 0, 0.2, 0), at(cyl(0.012, 0.012, 0.7, "#3a1a10", 4), 0.14, 0.62, 0.14), at(cyl(0.012, 0.012, 0.7, "#3a1a10", 4), -0.14, 0.62, -0.14)); return g; }

// --- home (a = 0) ---
const home = house("#fff1dc", "#ff7a59", 2.6, 1.9, 2.0, { door: "#3a9690" }); P(home, 0, -3.9); home.add(porch); porch.position.set(0, 2.0, 1.8);
P(mailbox(), 5.5, -2.2, 0, 1); P(fence(6), -11.5, -2.5); P(fence(6), 4.5, -2.5); P(tree(0), -11, -4.4, 0, 1.25); P(tree(2), 11.5, -5.2, 0, 1.1); P(bush(1), -6, -2.9); P(bush(3), 7, -3.0);
[["#ff8fa3", -4, -2.0], ["#ffd24a", -3, -2.1], ["#c9a7ff", 3.2, -2.0], ["#fffaf2", 8.5, -2.1], ["#ff8fa3", -8, 1.6], ["#ffd24a", 4, 1.8], ["#c9a7ff", -3, 2.2]].forEach((f) => P(flower(f[0]), f[1], f[2]));
// --- street (a 8..58) ---
[[14, "#ffe1a8", "#3a9690", 2.0, 1.7], [26.5, "#ffd9c7", "#8a5a9a", 2.1, 2.2], [39, "#dff0ff", "#ff7a59", 2.0, 1.6]].forEach((h, i) => P(house(h[1 - 1 + 1], h[2], h[3], h[4], 1.8, { door: ["#ff7a59", "#ffd24a", "#3a9690", "#ff5a7a"][i], doorX: i % 2 ? 0.5 : -0.5 }), h[0], -4.0));
[20.5, 33].forEach((a, i) => P(tree(i + 1), a, -2.6, 0, 0.95));
[10, 23, 36, 49].forEach((a) => P(lampPost(), a, -1.25));
P(hydrant(), 42.7, 1.25); P(bench(), 31, -1.7); 
for (let a = 10; a < 58; a += 4.5) { if (Math.abs(a - 33) < 3) continue; P(box(0.45, 0.02, 0.08, "#fffaf2"), a, 2.7, 0, 1, 0.005); }
for (let i = 0; i < 6; i++) P(box(0.18, 0.02, 0.9, "#fffaf2"), 31 + i * 1.6, 1.7, 0, 1, 0.006);
[12, 22, 30, 40, 47, 56].forEach((a, i) => P(bush(i), a, 3.3, 0, 0.9));
// --- park (a 58..150) ---
P(gate(), 61.5, 0);
[[66, -3.2, 1.2], [72, -5.0, 1.5], [80, -4.0, 1.1], [88, -5.6, 1.6], [96, -3.6, 1.2], [104, -5.2, 1.4], [112, -2.8, 1.1], [120, -4.6, 1.5], [130, -3.0, 1.2], [140, -4.4, 1.4], [148, -2.6, 1.1], [70, 4.4, 1.0], [92, 5.0, 1.1], [110, 4.6, 1.0], [128, 4.8, 1.2], [146, 4.2, 1.0], [84, -7.2, 1.3], [100, -7.6, 1.5], [118, -7.0, 1.3], [136, -7.4, 1.4]].forEach((t, i) => P(i % 3 ? tree(i) : pine(i), t[0], t[1], i * 40, t[2]));
const pondG = P(pond(), 108, -3.4); P(bench(), 69, -1.6); P(blanket(), 97, 2.4, 20); P(rock(1), 76, 2.6); P(rock(0.7), 118, 2.2); P(bench(), 124, -1.5);
for (let i = 0; i < 46; i++) { const a = 60 + rnd() * 88, z = (rnd() < 0.5 ? -1 : 1) * (1.0 + rnd() * 3.2); P(flower(["#ff8fa3", "#ffd24a", "#c9a7ff", "#fffaf2", "#ff8a66"][i % 5]), a, z, 0, 0.9 + rnd() * 0.5); }
// --- meadow (150..168) ---
for (let i = 0; i < 14; i++) P(flower(["#ffd24a", "#fffaf2"][i % 2]), 150 + rnd() * 16, (rnd() - 0.5) * 6);
// --- beach (168..237) ---
P(palm(), 176, 1.9, 40); P(palm(), 228, 1.6, 200, 1.1); P(palm(), 190, 3.2, 120, 0.9); P(umbrella(), 188, 1.8, 30); P(sandcastle(), 208, 1.5); P(rock(1.2), 172, -1.5); P(rock(0.8), 233, -1.2);
P(pier(), 214, -1.0); P(lighthouse(), 231, -4.2); const boats = [P(boat("#ff7a59"), 190, -4.4, 20), P(boat("#fffaf2"), 207, -6.2, -30), P(boat("#ffd24a"), 222, -5.0, 60)];
[[181, 0.9, "#ff8fa3"], [196, 1.2, "#fffaf2"], [220, 0.95, "#ff8a66"]].forEach((s) => P(at(mk(new THREE.SphereGeometry(0.1, 7, 5), s[2]), 0, 0, 0), s[0], s[1], 0, 1, 0.05));
// --- night woods (242..350) ---
[[246, -2.4], [252, -4.2], [258, -2.2], [264, -5.0], [270, -2.8], [276, -4.4], [283, -2.3], [290, -5.2], [297, -3.4], [305, -2.4], [312, -4.6], [319, -2.6], [326, -4.8], [333, -2.8], [341, -4.4], [250, 3.8], [262, 4.6], [276, 4.0], [290, 4.8], [304, 4.2], [318, 4.6], [332, 4.0], [344, 4.6], [256, -7.0], [272, -7.4], [288, -7.2], [306, -7.0], [322, -7.4], [338, -7.0]].forEach((t, i) => P(i % 4 === 1 ? tree(i) : pine(i), t[0], t[1], i * 50, 1.1 + (i % 3) * 0.25));
[250, 268, 286, 304, 322, 340].forEach((a) => P(lampPost(), a, -1.3));
const tentG = P(tent(), 296, -2.6, 20); P(rock(1), 281, 2.2); P(bush(2), 311, 2.6); P(bench(), 330, -1.6);
for (let i = 0; i < 9; i++) P(at(mk(new THREE.SphereGeometry(0.08, 7, 5), lampMat), 0, 0, 0), 344 + i * 1.5, -2.45, 0, 1, 1.0 + Math.sin(i * 0.9) * 0.08);
P(cyl(0.035, 0.035, 1.1, "#8a5a36", 5), 343.5, -2.45, 0, 1, 0.55); P(cyl(0.035, 0.035, 1.1, "#8a5a36", 5), 356.8, -2.45, 0, 1, 0.55);
// far side filler
for (let i = 0; i < 70; i++) { const a = rnd() * 360, z = (rnd() < 0.5 ? -1 : 1) * (5.6 + rnd() * 5.5); const lat = z / R / D2R; if (lat < -52) continue; if (a > 160 && a < 245 && z < 0) continue; if (a > 165 && a < 240 && z < 3.2) continue; P(i % 2 ? pine(i) : tree(i), a, z, i * 31, 0.9 + rnd() * 0.7); }
// fireflies in the woods
const flies = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: "#fff3a0", transparent: true, opacity: 0 })); m.userData = { a: 244 + rnd() * 104, z: (rnd() - 0.5) * 7, h: 0.5 + rnd() * 1.6, p: rnd() * 6.28 }; planet.add(m); flies.push(m); }
// clouds, balloon
const cloudG = new THREE.Group(); scene.add(cloudG);
for (let i = 0; i < 11; i++) { const c = cloud(0.9 + rnd() * 0.8); surf(c, (i * 33 + rnd() * 14) * D2R, (rnd() - 0.5) * 1.3, rnd() * 3, 5.5 + rnd() * 3.5); cloudG.add(c); }
const balG = new THREE.Group(); scene.add(balG); const bal = balloon(); surf(bal, 0, -0.5, 0, 6.5); balG.add(bal);

  glowA.visible = glowB.visible = false;
// ---------- humans ----------
function makeHuman(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const skin = o.skin, top = o.top, pants = o.pants;
  body.add(at(capsule(0.25, 0.44, top), 0, 1.32, 0)); if (o.skirt) body.add(at(cone(0.42, 0.7, o.skirt, 10), 0, 0.92, 0));
  const head = new THREE.Group(); head.position.set(0, 1.93, 0); body.add(head); head.add(sph(0.25, skin, 14, 10));
  const hair = mk(new THREE.SphereGeometry(0.266, 14, 10, 0, Math.PI * 2, 0, 1.75), o.hair); hair.rotation.z = 0.42; head.add(hair);
  let pony = null;
  if (o.style === "pony") { pony = new THREE.Group(); pony.position.set(-0.22, 0.1, 0); pony.add(at(capsule(0.07, 0.3, o.hair), -0.08, -0.16, 0, 0, 0, -0.5)); head.add(pony); }
  if (o.style === "long") head.add(at(box(0.2, 0.55, 0.46, o.hair), -0.16, -0.25, 0));
  if (o.style === "hat") { head.add(at(cyl(0.42, 0.42, 0.04, "#c98a5e", 14), 0, 0.14, 0)); head.add(at(cyl(0.2, 0.24, 0.22, "#c98a5e", 12), 0, 0.26, 0)); }
  if (o.style === "beanie") { const b = mk(new THREE.SphereGeometry(0.275, 14, 10, 0, Math.PI * 2, 0, 1.5), "#ffd24a"); b.rotation.z = 0.2; head.add(b); head.add(at(sph(0.08, "#fffaf2", 7, 5), -0.05, 0.3, 0)); }
  head.add(at(sph(0.03, "#2b1a14", 6, 5), 0.225, 0.02, 0.09)); head.add(at(sph(0.03, "#2b1a14", 6, 5), 0.225, 0.02, -0.09));
  const smile = mk(new THREE.TorusGeometry(0.07, 0.014, 5, 8, Math.PI), "#8a3f30"); at(smile, 0.215, -0.06, 0, 0, Math.PI / 2, Math.PI); head.add(smile);
  const mkLeg = (s) => { const l = new THREE.Group(); l.position.set(0, 0.95, s * 0.13); l.add(at(capsule(0.105, 0.58, pants), 0, -0.4, 0)); l.add(at(box(0.32, 0.13, 0.18, o.shoes || "#fffaf2"), 0.07, -0.86, 0)); body.add(l); return l; };
  const mkArm = (s) => { const a = new THREE.Group(); a.position.set(0, 1.56, s * 0.33); a.add(at(capsule(0.082, 0.4, top), 0, -0.26, 0)); const h = at(sph(0.088, skin, 8, 6), 0, -0.58, 0); a.add(h); body.add(a); a.userData.hand = h; return a; };
  const h = { root, body, head, legR: mkLeg(1), legL: mkLeg(-1), armR: mkArm(1), armL: mkArm(-1), pony }; if (o.scale) root.scale.setScalar(o.scale); if (o.bigHead) head.scale.setScalar(o.bigHead); return h;
}
function poseH(h, p) {
  const sit = p.sit || 0, sw = Math.sin(p.ph || 0) * (p.amp || 0);
  h.legR.rotation.z = lerp(sw, p.sitLeg === undefined ? 1.5 : p.sitLeg, sit); h.legL.rotation.z = lerp(-sw, p.sitLeg === undefined ? 1.42 : p.sitLeg, sit);
  h.armL.rotation.z = p.armL !== undefined ? p.armL : lerp(sw * 1.0, 0.5, sit); h.armR.rotation.z = p.armR !== undefined ? p.armR : lerp(-sw * 1.0, 0.5, sit);
  h.armR.rotation.x = p.armRx || 0; h.armL.rotation.x = -(p.armLx || 0);
  h.body.position.y = Math.abs(Math.sin(p.ph || 0)) * (p.bounce || 0.045) * (p.amp || 0) - sit * (p.sitDrop === undefined ? 0.68 : p.sitDrop); h.body.rotation.z = p.lean || 0; h.body.rotation.x = p.side || 0;
  h.head.rotation.y = p.headYaw || 0; h.head.rotation.z = p.headPitch || 0; if (h.pony) h.pony.rotation.z = Math.sin((p.ph || 0) * 2) * 0.5 * (p.amp || 0);
}
// ---------- dog / cat ----------
function makeDog(c1, c2, c3, collar) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(at(capsule(0.25, 0.5, c1), 0, 0.58, 0, 0, 0, Math.PI / 2)); body.add(at(sph(0.29, c1), 0.24, 0.6, 0)); body.add(at(capsule(0.17, 0.4, c2), 0, 0.46, 0, 0, 0, Math.PI / 2));
  const head = new THREE.Group(); head.position.set(0.42, 0.86, 0); body.add(head);
  head.add(at(sph(0.26, c1), 0.06, 0.06, 0)); head.add(at(capsule(0.125, 0.14, c2), 0.3, -0.02, 0, 0, 0, Math.PI / 2)); head.add(at(sph(0.06, "#2b1a14", 8, 6), 0.46, 0.02, 0));
  head.add(at(sph(0.042, "#2b1a14", 8, 6), 0.26, 0.14, 0.13)); head.add(at(sph(0.042, "#2b1a14", 8, 6), 0.26, 0.14, -0.13));
  const tongue = at(box(0.1, 0.03, 0.09, "#ff8fa3"), 0.33, -0.15, 0, 0, 0, -0.5); head.add(tongue);
  const ears = [1, -1].map((s) => { const e = new THREE.Group(); e.position.set(0.0, 0.2, s * 0.21); const m = sph(0.14, c3, 9, 7); m.scale.set(0.55, 1.25, 0.8); m.position.set(0, -0.16, s * 0.05); e.add(m); head.add(e); return e; });
  const legs = [[0.27, 0.15], [0.27, -0.15], [-0.27, 0.15], [-0.27, -0.15]].map((p) => { const l = new THREE.Group(); l.position.set(p[0], 0.45, p[1]); l.add(at(cyl(0.075, 0.065, 0.42, c1, 8), 0, -0.2, 0)); l.add(at(sph(0.085, c2, 8, 6), 0.02, -0.4, 0)); body.add(l); return l; });
  const tail = new THREE.Group(); tail.position.set(-0.46, 0.7, 0); tail.add(at(capsule(0.055, 0.3, c3), -0.12, 0.16, 0, 0, 0, 0.6)); body.add(tail);
  const col = at(mk(new THREE.TorusGeometry(0.2, 0.045, 7, 14), collar), 0.33, 0.74, 0, 0, Math.PI / 2, 0); col.rotation.z = -0.5; body.add(col);
  return { root, body, head, legs, tail, ears, tongue, wagRate: 19, wagAmp: 0.75 };
}
function makeCat(c1, c2, c3, collar) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(at(capsule(0.15, 0.38, c1), 0, 0.36, 0, 0, 0, Math.PI / 2)); body.add(at(capsule(0.1, 0.3, c2), 0.02, 0.29, 0, 0, 0, Math.PI / 2));
  for (let i = 0; i < 3; i++) body.add(at(box(0.05, 0.04, 0.3, c3), -0.14 + i * 0.13, 0.5, 0));
  const head = new THREE.Group(); head.position.set(0.3, 0.52, 0); body.add(head);
  head.add(at(sph(0.17, c1), 0.04, 0.05, 0)); head.add(at(sph(0.09, c2, 8, 6), 0.16, -0.0, 0)); head.add(at(sph(0.025, "#ff8fa3", 6, 4), 0.25, 0.02, 0));
  [1, -1].forEach((s) => { head.add(at(sph(0.036, "#c6e36b", 7, 5), 0.17, 0.1, s * 0.08)); head.add(at(sph(0.02, "#1a1a1a", 6, 4), 0.2, 0.1, s * 0.08)); });
  const ears = [1, -1].map((s) => { const e = new THREE.Group(); e.position.set(0.02, 0.17, s * 0.1); e.add(at(cone(0.07, 0.15, c1, 4), 0, 0.05, 0)); e.add(at(cone(0.04, 0.1, "#ffb9a8", 4), 0.015, 0.045, 0)); head.add(e); return e; });
  const tongue = new THREE.Group(); head.add(tongue);
  const legs = [[0.2, 0.09], [0.2, -0.09], [-0.2, 0.09], [-0.2, -0.09]].map((p) => { const l = new THREE.Group(); l.position.set(p[0], 0.3, p[1]); l.add(at(cyl(0.045, 0.04, 0.28, c1, 7), 0, -0.14, 0)); l.add(at(sph(0.055, c2, 7, 5), 0.01, -0.27, 0)); body.add(l); return l; });
  const tail = new THREE.Group(); tail.position.set(-0.32, 0.42, 0); tail.add(at(capsule(0.035, 0.3, c1), -0.1, 0.16, 0, 0, 0, 0.55)); const t2 = new THREE.Group(); t2.position.set(-0.2, 0.33, 0); t2.add(at(capsule(0.033, 0.22, c3), -0.02, 0.13, 0, 0, 0, -0.2)); tail.add(t2); body.add(tail);
  const col = at(mk(new THREE.TorusGeometry(0.115, 0.03, 6, 12), collar), 0.22, 0.44, 0, 0, Math.PI / 2, 0); col.rotation.z = -0.4; body.add(col);
  return { root, body, head, legs, tail, ears, tongue, wagRate: 3.2, wagAmp: 0.5, cat: true };
}
function poseQ(d, o, tu) {
  const s = o.s || 0, ph = o.ph || 0, amp = clamp(s / 1.3, 0, 1) * 0.62, run = ss(2.4, 3.4, s), air = o.air || 0, sit = o.sit || 0;
  d.legs.forEach((l, i) => { const front = i < 2, side = i % 2; const walk = Math.sin(ph + (front ? 0 : Math.PI) + (side ? Math.PI : 0)) * amp, gal = Math.sin(ph + (front ? 0 : 2.4) + side * 0.35) * 0.95; let r = lerp(walk, gal, run); r = lerp(r, front ? 1.15 : -1.05, air); if (sit) r = lerp(r, front ? -0.5 : -1.35, sit); if (o.crouch) r = lerp(r, front ? 0.5 : -0.5, o.crouch); l.rotation.z = r; });
  const k = d.cat ? 0.6 : 1;
  d.body.position.y = (Math.abs(Math.sin(ph)) * 0.05 * amp + run * Math.abs(Math.sin(ph)) * 0.09) * k - sit * 0.1 * k - (o.crouch || 0) * 0.09; d.body.rotation.z = (o.pitch || 0) + run * Math.sin(ph) * 0.1 + sit * 0.5; d.body.rotation.x = o.roll || 0; d.body.position.x = -sit * 0.1 * k;
  d.head.rotation.z = (o.headPitch || 0) - sit * 0.4; d.head.rotation.y = o.headYaw || 0; d.head.rotation.x = o.headTilt || 0;
  d.tail.rotation.x = Math.sin(tu * d.wagRate) * d.wagAmp * (o.wag === undefined ? 1 : o.wag) + (o.wiggle || 0); d.tail.rotation.z = (d.cat ? 0.25 : -0.2) + run * 0.5 + air * 0.4;
  const fl = Math.sin(ph * 2) * 0.25 * amp + run * 0.5 + air * 1.0; if (!d.cat) { d.ears[0].rotation.x = -fl - 0.05; d.ears[1].rotation.x = fl + 0.05; d.ears[0].rotation.z = d.ears[1].rotation.z = -(run * 0.5 + air * 0.6); } else { d.ears[0].rotation.z = d.ears[1].rotation.z = -(run * 0.3 + air * 0.5); }
  d.tongue.visible = !!o.tongue;
}
// ---------- rabbit ----------
function makeRabbit() {
  const root = new THREE.Group(), jump = new THREE.Group(), body = new THREE.Group(); root.add(jump); jump.add(body); const w = "#fffaf2", c = "#f0e2cf";
  const b = sph(0.2, w, 10, 8); b.scale.set(1.3, 0.95, 0.95); body.add(at(b, 0, 0.22, 0)); body.add(at(sph(0.17, c, 9, 7), -0.13, 0.2, 0)); body.add(at(sph(0.07, "#ffffff", 7, 5), -0.3, 0.2, 0));
  const foot = new THREE.Group(); foot.position.set(-0.16, 0.08, 0); const f = sph(0.07, c, 7, 5); f.scale.set(2, 0.6, 2.2); foot.add(at(f, 0.08, -0.03, 0)); body.add(foot);
  const paw = new THREE.Group(); paw.position.set(0.14, 0.14, 0); paw.add(at(cyl(0.035, 0.035, 0.14, w, 6), 0, -0.07, 0.07)); paw.add(at(cyl(0.035, 0.035, 0.14, w, 6), 0, -0.07, -0.07)); body.add(paw);
  const head = new THREE.Group(); head.position.set(0.2, 0.36, 0); body.add(head); head.add(at(sph(0.13, w, 10, 8), 0.03, 0.03, 0)); head.add(at(sph(0.03, "#ff8fa3", 6, 4), 0.155, 0.02, 0));
  [1, -1].forEach((s) => head.add(at(sph(0.022, "#2b1a14", 6, 4), 0.1, 0.07, s * 0.09)));
  const ears = [1, -1].map((s) => { const e = new THREE.Group(); e.position.set(-0.01, 0.13, s * 0.05); const m = capsule(0.035, 0.2, s > 0 ? w : c); e.add(at(m, 0, 0.13, 0)); e.add(at(box(0.012, 0.18, 0.03, "#ffc2c9"), 0.03, 0.13, 0)); head.add(e); return e; });
  return { root, jump, body, head, ears, foot, paw };
}
// ---------- parrot ----------
function makeParrot() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const b = sph(0.14, "#ff3b30", 10, 8); b.scale.set(1.5, 1, 1); body.add(at(b, 0, 0.2, 0)); body.add(at(box(0.36, 0.03, 0.12, "#2f7fe0"), -0.32, 0.2, 0)); body.add(at(box(0.3, 0.025, 0.06, "#ffd24a"), -0.3, 0.215, 0));
  const head = new THREE.Group(); head.position.set(0.16, 0.3, 0); body.add(head); head.add(sph(0.11, "#ff3b30", 9, 7)); head.add(at(sph(0.06, "#fffaf2", 7, 5), 0.06, 0.02, 0.07)); head.add(at(sph(0.06, "#fffaf2", 7, 5), 0.06, 0.02, -0.07));
  head.add(at(sph(0.022, "#1a1a1a", 6, 4), 0.09, 0.03, 0.105)); head.add(at(sph(0.022, "#1a1a1a", 6, 4), 0.09, 0.03, -0.105)); head.add(at(cone(0.055, 0.14, "#ffd24a", 6), 0.14, -0.02, 0, 0, 0, -2.0)); head.add(at(cone(0.04, 0.12, "#ff3b30", 5), -0.02, 0.13, 0, 0, 0, 0.5));
  const wings = [1, -1].map((s) => { const g = new THREE.Group(); g.position.set(0.02, 0.24, s * 0.1); g.add(at(box(0.26, 0.03, 0.3, "#ff3b30"), -0.02, 0, s * 0.15)); g.add(at(box(0.24, 0.03, 0.26, "#ffd24a"), -0.04, 0, s * 0.42)); g.add(at(box(0.2, 0.03, 0.22, "#2f7fe0"), -0.07, 0, s * 0.65)); body.add(g); return g; });
  body.add(at(cyl(0.012, 0.012, 0.1, "#3a3a3a", 4), 0.02, 0.04, 0.04)); body.add(at(cyl(0.012, 0.012, 0.1, "#3a3a3a", 4), 0.02, 0.04, -0.04));
  root.scale.setScalar(1.45); return { root, body, head, wings };
}

// ---------- assistant token (the GRRR diamond) ----------
const token = (() => { const g = new THREE.Group(), s = new THREE.Shape(), r = 0.5, c = 0.2; s.moveTo(0, r); s.quadraticCurveTo(c, c, r, 0); s.quadraticCurveTo(c, -c, 0, -r); s.quadraticCurveTo(-c, -c, -r, 0); s.quadraticCurveTo(-c, c, 0, r);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 14 }); geo.center(); const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#2f6bff", emissive: "#2563eb", emissiveIntensity: 0.75, roughness: 0.35 })); body.castShadow = true; g.add(body);
  [1, -1].forEach((sd) => { const wm = new THREE.MeshBasicMaterial({ color: "#ffffff" }); const pad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), wm); pad.scale.set(1.25, 1, 0.3); pad.position.set(0, -0.06, sd * 0.12); g.add(pad); [[-0.15, 0.07], [-0.055, 0.16], [0.055, 0.16], [0.15, 0.07]].forEach((p) => { const t = new THREE.Mesh(new THREE.SphereGeometry(0.047, 8, 6), wm); t.scale.z = 0.3; t.position.set(p[0], p[1], sd * 0.12); g.add(t); }); });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), new THREE.MeshBasicMaterial({ color: "#7fb0ff", transparent: true, opacity: 0.18, depthWrite: false })); g.add(halo);
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 6, 40), new THREE.MeshBasicMaterial({ color: "#9fc2ff", transparent: true, opacity: 0 })); g.add(m); return m; });
  const light = new THREE.PointLight("#8fb8ff", 0, 10, 2); g.add(light); scene.add(g); return { g, body, halo, rings, light }; })();
const dots = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: "#2563eb" })); scene.add(m); return m; });

function makePin(col) { const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, roughness: 0.4 }); const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 16), m); c.rotation.x = Math.PI; c.position.y = 0.45; g.add(c); const s = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 14), m); s.position.y = 1.1; g.add(s); const wm = new THREE.MeshBasicMaterial({ color: "#ffffff" }); [0.5, -0.5].forEach((z) => { g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.06), wm), 0, 1.1, z)); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.06), wm), 0, 1.1, z)); }); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); planet.add(g); return g; }
const PINS2 = [[108, -3.4], [150, 2.6], [200, 2.2], [231, -2.2], [270, 3.0], [300, -4.4], [20, 3.4], [50, -3.4]].map((p) => ({ p, g: makePin("#3b82f6") }));

  // =====================================================================
  //  GAME LAYER
  // =====================================================================
  const U = 1 / R / D2R;
  const PP = (obj, a, z, yaw, h) => surf(obj, a * D2R, z / R, yaw || 0, h || 0);
  const bump = (x, c, wd) => Math.exp(-Math.pow((x - c) / wd, 2));
  const popS = (x, x0, d) => { const u = clamp((x - x0) / (d || 0.35), 0, 1); return u <= 0 ? 0 : 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.18; };
  let thCur = 0;
  function wpos(a, z, h, out) { out.set(0, R + h, 0).applyAxisAngle(AX, z / R).applyAxisAngle(AZ, -(a - thCur) * D2R); return out; }
  const wrap = (d) => ((d + 540) % 360) - 180;

  // ---------- content (override with opts.strings / opts.pets / opts.scenarios) ----------
  const STR = Object.assign({
    title: "GRRR Care", tagline: "Un souci ? Tu peux le régler toi-même.", how: "Fais tourner la planète, touche le « ! » et choisis le bon geste.",
    play: "Jouer", replay: "Rejouer", askGrrr: "Demander à GRRR", next: "Continuer", health: "Score santé", ask: "Que faire ?",
    wrong: "Pas tout à fait…", endTitle: "Bravo !", endSolved: "soucis réglés", endMissed: "manqués", kibble: "croquettes", assistant: "GRRR",
  }, opts.strings || {});
  const PETS = [
    Object.assign({ id: "cat", name: "Mimi", site: 28 }, (opts.pets || {}).cat),
    Object.assign({ id: "dog", name: "Rocky", site: 86 }, (opts.pets || {}).dog),
    Object.assign({ id: "parrot", name: "Coco", site: 200 }, (opts.pets || {}).parrot),
    Object.assign({ id: "rabbit", name: "Pompon", site: 312 }, (opts.pets || {}).rabbit)];
  // {n} = pet name. `correct` = index in `options`. `cta` = which Care feature the host app should open.
  const SCENARIOS = opts.scenarios || [
    { id: "cat-water", pet: "cat", q: "{n} ne boit presque plus.", options: ["Une fontaine à eau", "Plus de croquettes", "Un bol de lait"], correct: 0, tip: "Les chats préfèrent l'eau qui coule.", ok: "{n} boit", prop: "fountain", cta: { target: "store", label: "Voir en boutique" } },
    { id: "cat-hair", pet: "cat", q: "{n} recrache des boules de poils.", options: ["Un bain chaque jour", "La brosser souvent", "Changer de litière"], correct: 1, tip: "Un brossage régulier limite les poils avalés.", ok: "{n} est toute douce", prop: "brush", cta: { target: "store", label: "Voir en boutique" } },
    { id: "dog-fleas", pet: "dog", q: "{n} se gratte sans arrêt !", options: ["Lui mettre un pull", "Moins de balades", "Un antiparasitaire mensuel"], correct: 2, tip: "Saison des puces : traite-le chaque mois.", ok: "{n} est protégé", prop: "pipette", cta: { target: "reminder", label: "Créer un rappel" } },
    { id: "dog-weight", pet: "dog", q: "{n} a pris du poids.", options: ["Plus de jeu et de balades", "Sauter des repas", "Plus de friandises"], correct: 0, tip: "De l'exercice chaque jour et des rations mesurées.", ok: "{n} se dépense", prop: "ball", cta: { target: "health", label: "Suivre son score santé" } },
    { id: "dog-choc", pet: "dog", q: "{n} a mangé du chocolat !", options: ["Attendre demain", "Appeler un véto maintenant", "Lui donner du lait"], correct: 1, tip: "Le chocolat est toxique pour les chiens : là, c'est le véto.", ok: "Le véto est prévenu", prop: "phone", cta: { target: "vet", label: "Vétos à côté" } },
    { id: "parrot-pluck", pet: "parrot", q: "{n} s'arrache les plumes…", options: ["Le laisser seul", "Des jouets et du temps avec toi", "Couvrir sa cage toute la journée"], correct: 1, tip: "Il s'ennuie : il a besoin de jeu et de compagnie.", ok: "{n} s'amuse", prop: "toy", cta: { target: "assistant", label: "Demander à GRRR" } },
    { id: "parrot-dull", pet: "parrot", q: "{n} a les plumes ternes.", options: ["Une douche tiède en brumisation", "Du shampoing", "Du pain"], correct: 0, tip: "Une brumisation d'eau tiède entretient le plumage.", ok: "{n} brille", prop: "spray", cta: { target: "assistant", label: "Demander à GRRR" } },
    { id: "rabbit-hay", pet: "rabbit", q: "{n} boude ses granulés.", options: ["Que des carottes", "Des bonbons", "Du foin à volonté"], correct: 2, tip: "Un lapin a besoin de foin à volonté.", ok: "{n} se régale", prop: "hay", cta: { target: "store", label: "Voir en boutique" } },
    { id: "rabbit-chew", pet: "rabbit", q: "{n} ronge les meubles.", options: ["Du bois à ronger", "Le gronder", "Le laisser en cage"], correct: 0, tip: "Ses dents poussent sans arrêt : il doit ronger.", ok: "{n} a de quoi ronger", prop: "stick", cta: { target: "store", label: "Voir en boutique" } }];
  const CFG = { duration: opts.duration || 90, patience: opts.patience || 32, spawnEvery: opts.spawnEvery || 6.5, maxActive: 3 };

  // ---------- cast ----------
  const OWN = [
    makeHuman({ skin: "#f0c8a0", top: "#ffb43a", pants: "#3b4a6b", hair: "#7a3a1a", style: "pony" }),
    makeHuman({ skin: "#e9b68c", top: "#ff7a59", pants: "#3b4a6b", hair: "#3a2418", style: "short" }),
    makeHuman({ skin: "#8a5a3c", top: "#2fb89a", pants: "#f2ead8", hair: "#1a1210", style: "short" }),
    makeHuman({ skin: "#c98a5e", top: "#8a5acf", pants: "#2a3350", hair: "#1a1210", style: "pony" })];
  const cat = makeCat("#8f949c", "#f2f2f2", "#5c6068", "#ff7a59"), dog = makeDog("#f2b266", "#fbe3bf", "#d98e3f", "#2563eb"), par = makeParrot(), rab = makeRabbit();
  const PET = [cat, dog, par, rab]; rab.root.scale.setScalar(1.5); par.root.scale.setScalar(1.75);
  [...OWN, ...PET].forEach((c) => planet.add(c.root));
  const PH = [0.95, 1.15, 2.25, 1.05];
  const perchA = grp(at(cyl(0.05, 0.07, 1.25, "#8a5a3c", 6), 0, 0.62, 0), at(cyl(0.035, 0.035, 0.9, "#a8713f", 6), 0, 1.24, 0, Math.PI / 2, 0, 0), at(cyl(0.22, 0.26, 0.06, "#6b4426", 10), 0, 0.03, 0)); planet.add(perchA);
  const PROPS = {
    fountain: grp(at(cyl(0.3, 0.34, 0.16, "#fffaf5", 14), 0, 0.08, 0), at(cyl(0.25, 0.25, 0.03, "#5bb8ff", 14), 0, 0.165, 0), at(cyl(0.07, 0.09, 0.3, "#dfe9f7", 8), 0, 0.3, 0), at(sph(0.08, "#5bb8ff", 8, 6), 0, 0.48, 0)),
    brush: grp(at(box(0.5, 0.1, 0.2, "#ff7a59"), 0, 0.2, 0, 0, 0, 0.3), at(box(0.3, 0.12, 0.18, "#fffaf5"), -0.1, 0.1, 0, 0, 0, 0.3)),
    pipette: grp(at(cyl(0.07, 0.07, 0.4, "#2563eb", 8), 0, 0.42, 0), at(cone(0.07, 0.2, "#fffaf5", 8), 0, 0.12, 0, Math.PI, 0, 0), at(cyl(0.09, 0.09, 0.08, "#fffaf5", 8), 0, 0.64, 0)),
    ball: grp(at(sph(0.2, "#ff5a5a", 12, 9), 0, 0.2, 0), at(cyl(0.205, 0.205, 0.05, "#fffaf5", 14), 0, 0.2, 0)),
    phone: grp(at(box(0.3, 0.56, 0.05, "#0f1b3d"), 0, 0.42, 0, -0.25, 0, 0), at(box(0.25, 0.48, 0.02, "#4f9dff"), 0, 0.425, 0.03, -0.25, 0, 0)),
    toy: (() => { const g = new THREE.Group(); g.add(at(cyl(0.012, 0.012, 0.5, "#3a3a3a", 4), 0, 0.75, 0)); const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 6, 16), M("#ffd24a")); r.position.y = 0.4; g.add(r); g.add(at(sph(0.08, "#ff5a7a", 7, 5), 0, 0.16, 0)); g.add(at(sph(0.06, "#2f7fe0", 7, 5), 0, 0.62, 0)); return g; })(),
    spray: grp(at(cyl(0.12, 0.14, 0.4, "#5bb8ff", 10), 0, 0.2, 0), at(cyl(0.05, 0.05, 0.14, "#fffaf5", 8), 0, 0.47, 0), at(box(0.22, 0.1, 0.1, "#fffaf5"), 0.06, 0.58, 0)),
    hay: (() => { const g = new THREE.Group(); for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.05 + (i % 5) * 0.045; g.add(at(box(0.34, 0.035, 0.035, i % 2 ? "#e8c860" : "#d4ab3c"), Math.cos(a) * r, 0.04 + (i % 4) * 0.045, Math.sin(a) * r, 0, a, (i % 3 - 1) * 0.35)); } g.scale.setScalar(1.4); const h = new THREE.Group(); h.add(g); return h; })(),
    stick: grp(at(cyl(0.05, 0.06, 0.6, "#a8713f", 6), 0, 0.08, 0, 0, 0, 1.5), at(cyl(0.045, 0.05, 0.5, "#8a5a3c", 6), 0.05, 0.16, 0.08, 0.4, 0, 1.4), at(cyl(0.04, 0.05, 0.45, "#c98a5e", 6), -0.05, 0.14, -0.08, -0.5, 0, 1.6)) };
  Object.values(PROPS).forEach((p) => { p.visible = false; planet.add(p); });
  const fleas = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: "#2b1a14" })); planet.add(m); return m; });
  const feathers = [0, 1, 2, 3, 4].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.06), M(i % 2 ? "#ff3b30" : "#ffd24a")); planet.add(m); return m; });

  // ---------- environment (60 s day cycle) ----------
  const E_SUNRISE = { top: "#7aa8e8", bot: "#ffd2a0", sun: [9, 2.8, 4], sc: "#ffc890", si: 0.72, hs: "#ffe6d0", hg: "#7a8a8a", hi: 0.56, fl: 0.3, night: 0.2, disc: "#ffc070" },
    E_DAY = { top: "#5fbcff", bot: "#e2f5ff", sun: [7, 8, 6], sc: "#fff4dc", si: 0.78, hs: "#ffffff", hg: "#6a9a6a", hi: 0.5, fl: 0.12, night: 0, disc: "#ffe07a" },
    E_SUNSET = { top: "#c85a7a", bot: "#ffa878", sun: [-7, 2.2, 4], sc: "#ff9a6a", si: 0.7, hs: "#ffc9b0", hg: "#7a5a7a", hi: 0.58, fl: 0.4, night: 0.4, disc: "#ff8a4a" },
    E_NIGHT = { top: "#0c1238", bot: "#2b3070", sun: [4, 9, 8], sc: "#9fb4ff", si: 0.6, hs: "#9fb0ff", hg: "#22345a", hi: 0.7, fl: 0.3, night: 1, disc: "#0c1238" };
  const DAY = opts.dayLength || 80;
  const ENV = [[0, E_DAY], [0.42, E_DAY], [0.52, E_SUNSET], [0.6, E_NIGHT], [0.82, E_NIGHT], [0.92, E_SUNRISE], [1, E_DAY]].map(([t, e]) => { const o = Object.assign({}, e, { t: t * DAY }); ["top", "bot", "sc", "hs", "hg", "disc"].forEach((k) => (o[k] = new THREE.Color(o[k]))); return o; });
  const focus = V3(0, R, 0);
  function applyEnv(w) {
    let i = 0; while (i < ENV.length - 2 && ENV[i + 1].t < w) i++; const a = ENV[i], b = ENV[i + 1], u = sm((w - a.t) / (b.t - a.t));
    skyMat.uniforms.top.value.copy(a.top).lerp(b.top, u); skyMat.uniforms.bot.value.copy(a.bot).lerp(b.bot, u);
    const dir = V3(lerp(a.sun[0], b.sun[0], u), lerp(a.sun[1], b.sun[1], u), lerp(a.sun[2], b.sun[2], u)).normalize();
    sun.color.copy(a.sc).lerp(b.sc, u); sun.intensity = lerp(a.si, b.si, u); sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(dir, 40);
    hemi.color.copy(a.hs).lerp(b.hs, u); hemi.groundColor.copy(a.hg).lerp(b.hg, u); hemi.intensity = lerp(a.hi, b.hi, u); fill.intensity = lerp(a.fl, b.fl, u);
    const night = lerp(a.night, b.night, u); lampMat.emissiveIntensity = night * 1.5; winMat.emissiveIntensity = night * 1.3; starMat.opacity = ss(0.8, 1, night); moon.material.opacity = starMat.opacity;
    sunDisc.material.color.copy(a.disc).lerp(b.disc, u); const dd = dir.clone(); dd.y = Math.max(dd.y * 0.55, 0.1); sunDisc.position.copy(dd.normalize()).multiplyScalar(330); sunHalo.position.copy(sunDisc.position); sunHalo.material.color.copy(sunDisc.material.color); sunDisc.visible = sunHalo.visible = night < 0.9;
    return night;
  }

  // ---------- DOM ----------
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PAW = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><ellipse cx="12" cy="15.5" rx="5" ry="4"/><circle cx="5.5" cy="10" r="2.1"/><circle cx="9.5" cy="6" r="2.1"/><circle cx="14.5" cy="6" r="2.1"/><circle cx="18.5" cy="10" r="2.1"/></svg>';
  const hud = el("div", "gcg-hud");
  hud.innerHTML = `<div class="gcg-top"><div class="gcg-pill gcg-kib"><span class="gcg-dot"></span><b data-k>0</b></div><div class="gcg-pill gcg-health"><span>${esc(STR.health)}</span><div class="gcg-bar"><i data-hb></i></div><b data-h>70</b></div><div class="gcg-pill gcg-time"><b data-t></b></div><button class="gcg-pill gcg-mute" aria-label="Son" data-mute>♪</button></div>`;
  root.appendChild(hud);
  const badgeLayer = el("div", "gcg-badges"); root.appendChild(badgeLayer);
  const badges = PETS.map((p, i) => { const b = el("button", "gcg-badge", `<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="gcg-ring-bg"/><circle cx="22" cy="22" r="19" class="gcg-ring" pathLength="100"/></svg><span>!</span>`); b.setAttribute("aria-label", p.name); b.addEventListener("click", () => openSheet(i)); badgeLayer.appendChild(b); return b; });
  const arrows = [el("button", "gcg-arrow gcg-left", "‹ !"), el("button", "gcg-arrow gcg-right", "! ›")]; arrows.forEach((a) => root.appendChild(a));
  const toast = el("div", "gcg-toast"); root.appendChild(toast);
  const sheet = el("div", "gcg-sheet"); root.appendChild(sheet);
  const cardIntro = el("div", "gcg-card gcg-show", `<div class="gcg-logo">${PAW}</div><h1>${esc(STR.title)}</h1><p class="gcg-tag">${esc(STR.tagline)}</p><p>${esc(STR.how)}</p><button class="gcg-btn" data-play>${esc(STR.play)}</button>`); root.appendChild(cardIntro);
  const cardEnd = el("div", "gcg-card"); root.appendChild(cardEnd);
  const $ = (sel, r) => (r || root).querySelector(sel);

  // ---------- sound (tiny WebAudio synth, no files) ----------
  let actx = null, muted = !!opts.muted;
  function tone(f, d, type, vol, when) { if (muted) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime + (when || 0), o = actx.createOscillator(), g = actx.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) { /* no audio */ } }
  const SFX = { pop: () => tone(520, 0.12, "triangle", 0.1), alert: () => { tone(660, 0.12, "square", 0.05); tone(880, 0.16, "square", 0.05, 0.12); }, good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, "sine", 0.12, i * 0.09)), bad: () => { tone(220, 0.18, "sawtooth", 0.06); tone(180, 0.25, "sawtooth", 0.06, 0.12); }, miss: () => tone(160, 0.4, "sine", 0.1), end: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, "sine", 0.1, i * 0.12)) };

  // ---------- state ----------
  const emit = (type, payload) => { const msg = { source: "grrr-care-game", type, payload: payload || {} }; try { opts.onEvent && opts.onEvent(type, msg.payload); } catch (e) { console.error(e); } try { if (opts.postMessage !== false && window.parent && window.parent !== window) window.parent.postMessage(msg, opts.targetOrigin || "*"); } catch (e) { /* ignore */ } };
  const S = { mode: "intro", time: 0, left: CFG.duration, kibble: 0, health: opts.startHealth === undefined ? 70 : opts.startHealth, solved: 0, missed: 0, spawnIn: 1.2, th: PETS[0].site + 25, vel: 0, focusI: -1, focusK: 0, sheetStage: "", paused: false, lastSc: null };
  const SEEN = new Set();
  const PS = PETS.map(() => ({ sc: null, left: 0, sad: 0, fixT: 99, prop: null, propT: 99, tries: 0, lastSc: null }));
  const fmt = (s, i) => s.replace(/\{n\}/g, PETS[i].name);
  function hudSync() { $("[data-k]").textContent = S.kibble; $("[data-h]").textContent = Math.round(S.health); $("[data-hb]").style.width = S.health + "%"; const t = Math.max(0, Math.ceil(S.left)); $("[data-t]").textContent = Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); $("[data-mute]").classList.toggle("gcg-off", muted); }
  function say(text, good) { toast.textContent = text; toast.className = "gcg-toast gcg-on" + (good ? " gcg-good" : ""); clearTimeout(say.t); say.t = setTimeout(() => (toast.className = "gcg-toast"), 1900); }
  function spawn(force) {
    const free = PS.map((p, i) => (p.sc ? -1 : i)).filter((i) => i >= 0 && i !== S.focusI); if (!free.length) return false;
    const forFree = (s) => free.some((i) => PETS[i].id === s.pet) && s.id !== S.lastSc; let pool = SCENARIOS.filter((s) => forFree(s) && !SEEN.has(s.id)); if (!pool.length && SCENARIOS.some(forFree)) { SEEN.clear(); pool = SCENARIOS.filter(forFree); } if (force) pool = SCENARIOS.filter((s) => s.id === force); if (!pool.length) return false;
    const sc = pool[Math.floor(Math.random() * pool.length)], i = PETS.findIndex((p) => p.id === sc.pet), p = PS[i]; if (p.sc) return false;
    p.sc = sc; p.left = CFG.patience; p.tries = 0; p.fixT = 99; S.lastSc = sc.id; SEEN.add(sc.id); SFX.alert(); emit("problem", { scenario: sc.id, pet: sc.pet, name: PETS[i].name }); return true;
  }
  function start() { Object.assign(S, { mode: "play", left: CFG.duration, kibble: 0, health: opts.startHealth === undefined ? 70 : opts.startHealth, solved: 0, missed: 0, spawnIn: 0.8, focusI: -1 }); PS.forEach((p) => Object.assign(p, { sc: null, fixT: 99, propT: 99 })); cardIntro.classList.remove("gcg-show"); cardEnd.classList.remove("gcg-show"); hud.classList.add("gcg-show"); hudSync(); SFX.pop(); emit("start", { duration: CFG.duration }); }
  function finish() { S.mode = "end"; closeSheet(true); hud.classList.remove("gcg-show"); const r = { solved: S.solved, missed: S.missed, kibble: S.kibble, health: Math.round(S.health) };
    cardEnd.innerHTML = `<div class="gcg-logo">${PAW}</div><h1>${esc(STR.endTitle)}</h1><div class="gcg-stats"><div><b>${r.solved}</b><span>${esc(STR.endSolved)}</span></div><div><b>${r.kibble}</b><span>${esc(STR.kibble)}</span></div><div><b>${r.health}</b><span>${esc(STR.health)}</span></div></div><button class="gcg-btn" data-cta>${esc(STR.askGrrr)}</button><button class="gcg-btn gcg-ghost" data-play>${esc(STR.replay)}</button>`;
    cardEnd.classList.add("gcg-show"); SFX.end(); emit("end", r); }
  function openSheet(i) { const p = PS[i]; if (S.mode !== "play" || !p.sc) return; S.focusI = i; S.sheetStage = "ask"; SFX.pop(); const sc = p.sc;
    sheet.innerHTML = `<button class="gcg-x" aria-label="Fermer" data-close>×</button><div class="gcg-q">${esc(fmt(sc.q, i))}</div><div class="gcg-a"><span class="gcg-tok">${PAW}</span><div><small>${esc(STR.assistant)}</small><p data-say>${esc(STR.ask)}</p></div></div><div class="gcg-opts">${sc.options.map((o, k) => `<button class="gcg-opt" data-o="${k}">${esc(o)}</button>`).join("")}</div>`;
    sheet.classList.add("gcg-show"); emit("open", { scenario: sc.id }); }
  function closeSheet(silent) { if (S.focusI < 0) return; S.focusI = -1; S.sheetStage = ""; sheet.classList.remove("gcg-show"); if (!silent) SFX.pop(); }
  function answer(k, btn) { const i = S.focusI, p = PS[i], sc = p && p.sc; if (!sc || S.sheetStage !== "ask") return; p.tries++; const correct = k === sc.correct; emit("answer", { scenario: sc.id, option: k, correct });
    if (!correct) { btn.classList.add("gcg-wrong"); btn.disabled = true; $("[data-say]", sheet).textContent = STR.wrong + " " + sc.tip; SFX.bad(); return; }
    const reward = [10, 6, 3][Math.min(p.tries - 1, 2)]; S.kibble += reward; S.health = clamp(S.health + (p.tries === 1 ? 8 : 5), 0, 100); S.solved++; p.sc = null; p.lastSc = sc; p.fixT = 0; p.prop = sc.prop; p.propT = 0; S.sheetStage = "done"; SFX.good(); hudSync();
    sheet.innerHTML = `<div class="gcg-ok">${esc(fmt(sc.ok, i))} ✓ <em>+${reward}</em></div><div class="gcg-a"><span class="gcg-tok">${PAW}</span><div><small>${esc(STR.assistant)}</small><p>${esc(sc.tip)}</p></div></div><div class="gcg-row">${sc.cta ? `<button class="gcg-btn gcg-ghost" data-link>${esc(sc.cta.label)}</button>` : ""}<button class="gcg-btn" data-close>${esc(STR.next)}</button></div>`;
    sheet.dataset.sc = sc.id; emit("solved", { scenario: sc.id, pet: sc.pet, tries: p.tries, reward }); emit("score", { kibble: S.kibble, health: Math.round(S.health) }); }
  function miss(i) { const p = PS[i], sc = p.sc; p.sc = null; S.missed++; S.health = clamp(S.health - 8, 0, 100); SFX.miss(); say(fmt(sc.tip, i)); hudSync(); emit("missed", { scenario: sc.id, pet: sc.pet }); emit("score", { kibble: S.kibble, health: Math.round(S.health) }); }

  // ---------- input ----------
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); listeners.push(() => t.removeEventListener(ev, fn, o)); };
  const listeners = []; let drag = null;
  on(canvas, "pointerdown", (e) => { if (S.mode !== "play" || S.focusI >= 0) return; drag = { x: e.clientX, t: performance.now() }; S.vel = 0; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* */ } });
  on(canvas, "pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, now = performance.now(), k = 150 / root.clientWidth; S.th -= dx * k; S.vel = (-dx * k) / Math.max((now - drag.t) / 1000, 0.008); drag.x = e.clientX; drag.t = now; });
  const endDrag = () => { drag = null; }; on(canvas, "pointerup", endDrag); on(canvas, "pointercancel", endDrag);
  on(root, "click", (e) => { const t = e.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-play")) start(); else if (t.hasAttribute("data-close")) closeSheet(); else if (t.hasAttribute("data-o")) answer(+t.getAttribute("data-o"), t);
    else if (t.hasAttribute("data-link")) { const sc = SCENARIOS.find((s) => s.id === sheet.dataset.sc); emit("cta", { target: sc.cta.target, scenario: sc.id, pet: sc.pet }); }
    else if (t.hasAttribute("data-cta")) emit("cta", { target: "assistant" }); else if (t.hasAttribute("data-mute")) { muted = !muted; hudSync(); } });
  arrows.forEach((a, k) => on(a, "click", () => { const i = a._i; if (i >= 0) openSheet(i); }));
  on(document, "visibilitychange", () => { S.hidden = document.hidden; });

  // ---------- frame ----------
  const v1 = V3(), v2 = V3(), TK = V3(), cl = V3(), cp = V3();
  let W = 0, H = 0;
  function resize() { const w = root.clientWidth, h = root.clientHeight; if (!w || !h || (w === W && h === H)) return; W = w; H = h; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio || 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function frame(dt) {
    const T = (S.time += dt); resize(); const asp = camera.aspect;
    // --- rules ---
    if (S.mode === "play" && !S.paused) { const frozen = S.focusI >= 0;
      if (!frozen) { S.left -= dt; S.spawnIn -= dt; if (S.spawnIn <= 0 && PS.filter((p) => p.sc).length < CFG.maxActive) { spawn(); S.spawnIn = CFG.spawnEvery * (0.75 + Math.random() * 0.5); }
        PS.forEach((p, i) => { if (p.sc) { p.left -= dt; if (p.left <= 0) miss(i); } }); if (S.left <= 0) finish(); }
      if (Math.floor(S.left) !== S._sec) { S._sec = Math.floor(S.left); hudSync(); } }
    // --- planet rotation ---
    if (S.mode === "intro" || S.mode === "end") S.th += dt * 7;
    else if (S.focusI >= 0) { S.th += wrap(PETS[S.focusI].site - S.th) * (1 - Math.exp(-dt * 5)); S.vel = 0; }
    else if (!drag) { S.th += S.vel * dt; S.vel *= Math.exp(-dt * 3); }
    S.focusK += ((S.focusI >= 0 ? 1 : 0) - S.focusK) * (1 - Math.exp(-dt * 5)); const fk = sm(S.focusK);
    const th = S.th; thCur = th; planet.rotation.z = th * D2R; cloudG.rotation.z = th * D2R * 0.8 + T * 0.03; cloudG.rotation.x = Math.sin(T * 0.1) * 0.1; balG.rotation.z = th * D2R * 0.6 - 2.6 + T * 0.05;
    // --- camera ---
    const dO = clamp(15.5 / asp, 17, 30), dF = clamp(6.2 / asp, 8.5, 13), d = lerp(dO, dF, fk), elv = lerp(24, 9, fk) * D2R, az = lerp(Math.sin(T * 0.25) * 4, -8, fk) * D2R;
    cl.set(lerp(0, 0.1, fk), R + lerp(asp < 1 ? 0.4 : -1.2, asp < 1 ? -0.9 : 0.6, fk), lerp(0, 1, fk)); cp.set(cl.x + d * Math.sin(az) * Math.cos(elv), cl.y + d * Math.sin(elv), cl.z + d * Math.cos(az) * Math.cos(elv));
    camera.position.copy(cp); camera.up.set(0, 1, 0); camera.lookAt(cl); camera.updateMatrixWorld(true); sky.position.copy(cp);
    const night = applyEnv((T + DAY * 0.1) % DAY);
    // --- cast ---
    for (let i = 0; i < 4; i++) { const p = PS[i], site = PETS[i].site, aO = site - 0.55 * U, zO = 0.9, aP = site + 0.62 * U, zP = 1.15; p.sad += ((p.sc ? 1 : 0) - p.sad) * (1 - Math.exp(-dt * 6)); p.fixT += dt; p.propT += dt;
      const sad = p.sad, f = 1 - sad, lu = p.fixT, focused = S.focusI === i && S.sheetStage === "ask" ? 1 : 0, kneel = i === 2 ? 0 : ss(0.0, 0.4, lu) * (1 - ss(1.1, 1.5, lu)), reach = ss(0.0, 0.4, lu) * (1 - ss(1.1, 1.5, lu)), cheer = ss(1.3, 1.5, lu) * (1 - ss(2.3, 2.6, lu)), hopJ = lu > 0.5 && lu < 1.7 ? Math.abs(Math.sin((lu - 0.5) / 0.3 * Math.PI)) : 0, happy = lu < 4 ? 1 : 0, sid = (p.sc || p.lastSc || {}).id;
      const O = OWN[i]; O.phone = O.phone || 0; O.phone += (focused - O.phone) * (1 - Math.exp(-dt * 8)); PP(O.root, aO, zO, -0.4, cheer * Math.abs(Math.sin(lu * 9)) * 0.18);
      poseH(O, { ph: 0, amp: 0, sit: kneel, sitDrop: 0.78, armR: O.phone > 0.03 ? lerp(0.3, 1.7, O.phone) : reach > 0.05 ? lerp(0.3, i === 2 ? 1.75 : 1.15, reach) : cheer > 0.05 ? 2.9 : 0.12 + Math.sin(T * 1.3 + i) * 0.05, armL: cheer > 0.05 ? 2.9 : -0.12 - Math.sin(T * 1.3 + i) * 0.05, headPitch: kneel * 0.15 - O.phone * 0.1 - sad * 0.1, headYaw: f * Math.sin(T * 0.5 + i * 2) * 0.25 });
      const yawP = -2.6;
      if (i === 0) { PP(cat.root, aP, zP, yawP, hopJ * 0.14); const drink = happy * ss(0.4, 0.8, lu) * (sid === "cat-water" ? 1 : 0);
        poseQ(cat, { s: 0, ph: 0, sit: sad * 0.95, headPitch: lerp(-0.42 * sad, -0.75 + Math.sin(T * 15) * 0.07, drink), headYaw: sad * (0.5 + Math.sin(T * 0.8) * 0.25), wag: 0.15 + f * 0.9, air: hopJ * 0.2 }, T); }
      if (i === 1) { PP(dog.root, aP, zP, yawP, hopJ * 0.4); const itch = sid === "dog-fleas" ? sad : 0;
        poseQ(dog, { s: 0, ph: 0, sit: sad * 0.9, headTilt: itch * (0.3 + Math.sin(T * 24) * 0.06), headPitch: -sad * 0.3, roll: itch * Math.sin(T * 24) * 0.05, wag: sad > 0.5 ? 0.1 : 1, tongue: sad < 0.3 && happy > 0, air: hopJ * 0.5 }, T);
        if (itch > 0.5) dog.legs[2].rotation.z = -1.9 + Math.sin(T * 30) * 0.4;
        fleas.forEach((m, k) => { m.visible = itch > 0.02; if (m.visible) { const a = k * 1.7 + T * 1.3; PP(m, aP + Math.cos(a) * 0.38 * U, zP + Math.sin(a) * 0.3, 0, 0.5 + Math.abs(Math.sin(T * 8 + k * 1.3)) * 0.5); m.scale.setScalar(itch * 1.3); } }); }
      if (i === 2) { const fl = happy * ss(0.3, 0.6, lu) * (0.5 + 0.5 * Math.sin(lu * 7)); PP(par.root, aP, zP, yawP, 1.27 + Math.max(fl - 0.6, 0) * 0.25); PP(perchA, aP, zP, 1.2, 0);
        const fw = Math.sin(T * 38), fo = clamp(fl * 1.4, 0, 1); par.wings[0].rotation.x = lerp(1.35, -fw * 0.9 - 0.1, fo); par.wings[1].rotation.x = lerp(-1.35, fw * 0.9 + 0.1, fo); const pl = sid === "parrot-pluck" ? sad : 0;
        par.head.rotation.z = pl * (-0.95 + Math.sin(T * 17) * 0.22) + (sad - pl) * -0.5 + f * Math.sin(T * 5) * 0.2; par.head.rotation.y = pl * 0.9; par.body.rotation.z = sad * -0.15 + f * Math.sin(T * 6) * 0.05;
        feathers.forEach((m, k) => { const q = (T * 0.55 + k * 0.2) % 1; m.visible = pl > 0.02; if (m.visible) { PP(m, aP + (Math.sin(k * 2.4) * 0.3 + Math.sin(T * 3 + k) * 0.1) * U, zP + 0.25 + Math.cos(k * 1.7) * 0.2, T * 2 + k, 0.06 + 1.5 * (1 - q)); m.rotateX(Math.sin(T * 4 + k) * 0.8); m.scale.setScalar(pl * Math.min(1, q * 6) * 1.3); } }); }
      if (i === 3) { PP(rab.root, aP, zP, yawP, 0); rab.jump.position.y = hopJ * 0.3; const nib = happy * (hopJ > 0 ? 0 : 1) * ss(0.3, 0.6, lu);
        rab.head.rotation.z = -sad * 0.3 + nib * (-0.35 + Math.sin(T * 20) * 0.08); rab.ears.forEach((e, k) => (e.rotation.z = lerp(0.15 + (k ? 0.12 : 0), 1.45, sad))); rab.body.scale.set(1, 1 - sad * 0.08, 1); rab.foot.rotation.z = hopJ * 0.8; }
      // prop that pops when the owner fixes the problem
      if (p.prop) { const g = PROPS[p.prop], s = popS(p.propT, 0.25, 0.4) * (1 - ss(7, 7.5, p.propT)); g.visible = s > 0.01; if (g.visible) { const onPerch = p.prop === "toy"; PP(g, site + (onPerch ? 1.15 : 0.02) * U, onPerch ? 1.15 : 1.45, T * (p.prop === "ball" ? 2 : 0) + 0.4, p.prop === "ball" ? Math.abs(Math.sin(p.propT * 5)) * 0.5 * Math.exp(-p.propT * 0.5) : p.prop === "pipette" || p.prop === "phone" || p.prop === "spray" ? 0.25 + Math.sin(T * 3) * 0.05 : 0); g.scale.setScalar(s * 1.15); } else if (p.propT > 8) p.prop = null; }
      // badge
      const b = badges[i]; wpos(aP, zP, PH[i] + 0.75 + Math.sin(T * 5 + i) * 0.05, v1); const facing = v1.y > R * 0.55 && v1.z > -2; v1.project(camera); const vis = !!p.sc && facing && Math.abs(v1.x) < 0.98 && S.focusI < 0 && S.mode === "play";
      b.classList.toggle("gcg-on", vis); if (vis) { b.style.transform = `translate(${((v1.x + 1) / 2) * W}px, ${((1 - v1.y) / 2) * H}px)`; b.style.setProperty("--p", clamp(p.left / CFG.patience, 0, 1) * 100); b.classList.toggle("gcg-urgent", p.left < 8); } p._vis = vis; }
    // off-screen arrows
    { let L = -1, Rr = -1, dl = 999, dr = 999; if (S.mode === "play" && S.focusI < 0) PS.forEach((p, i) => { if (!p.sc || p._vis) return; const dd = wrap(PETS[i].site - th); if (dd < 0 && -dd < dl) { dl = -dd; L = i; } if (dd >= 0 && dd < dr) { dr = dd; Rr = i; } });
      arrows[0]._i = L; arrows[1]._i = Rr; arrows[0].classList.toggle("gcg-on", L >= 0); arrows[1].classList.toggle("gcg-on", Rr >= 0); }
    // assistant token
    { if (S.focusI >= 0) wpos(PETS[S.focusI].site - 1.3 * U, 1.0, 3.0, v2); else v2.set(0, R + 3.9, 0); TK.lerp(v2, 1 - Math.exp(-dt * 6)); if (T < 0.1) TK.copy(v2); token.g.position.copy(TK); token.g.position.y += Math.sin(T * 2.4) * 0.08; token.g.quaternion.copy(camera.quaternion); token.g.rotateY(Math.sin(T * 1.7) * 0.5); token.g.scale.setScalar(lerp(1.0, 0.7, fk) * (1 + Math.sin(T * 4) * 0.03));
      token.rings.forEach((r, i) => { const q = (T * 0.9 + i * 0.5) % 1; r.scale.setScalar(1 + q * 1.6); r.material.opacity = (1 - q) * 0.6; }); token.light.intensity = night * 1.6; token.halo.material.opacity = 0.14 + Math.sin(T * 3) * 0.04; }
    // ambient
    pondG.userData.ducks.forEach((dk, i) => { const a = T * 0.5 + i * 2.1; dk.position.set(Math.cos(a) * 0.8, 0.06 + Math.sin(T * 3 + i) * 0.015, Math.sin(a) * 0.8); dk.rotation.y = -a - 1.57; });
    boats.forEach((b, i) => { b.rotation.z = Math.sin(T * 1.6 + i) * 0.08; b.rotation.x = Math.sin(T * 1.3 + i * 2) * 0.06; });
    flies.forEach((m) => { const u = m.userData; surf(m, (u.a + Math.sin(T * 0.7 + u.p) * 1.5) * D2R, (u.z + Math.cos(T * 0.9 + u.p) * 0.3) / R, 0, u.h + Math.sin(T * 1.3 + u.p) * 0.25); m.material.opacity = night * (0.5 + 0.5 * Math.sin(T * 3 + u.p * 3)); });
    tentG.userData.fire.scale.set(1 + Math.sin(T * 17) * 0.15, 1 + Math.sin(T * 23) * 0.25, 1 + Math.cos(T * 19) * 0.15); porch.intensity = night * 1.2; lantern.intensity = 0;
    renderer.render(scene, camera);
  }
  let raf = 0, last = 0, dead = false;
  function loop(now) { if (dead) return; raf = requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000 || 0.016, 0.05); last = now; if (S.hidden) return; frame(dt); }
  if (Array.isArray(opts.only) && opts.only.length) { [cat, dog, par, rab].forEach((a, i) => { const on = opts.only.includes(PETS[i].id); a.root.visible = on; OWN[i].root.visible = on; if (i === 2) perchA.visible = on; }); const first = PETS.find((p) => opts.only.includes(p.id)); if (first) S.th = first.site + 25; }
  hudSync(); frame(0.016); raf = requestAnimationFrame(loop); emit("ready", { version: VERSION, scenarios: SCENARIOS.map((s) => s.id) });

  return {
    version: VERSION,
    start, pause() { S.paused = true; }, resume() { S.paused = false; },
    setMuted(m) { muted = !!m; hudSync(); },
    getState() { return { mode: S.mode, kibble: S.kibble, health: Math.round(S.health), solved: S.solved, missed: S.missed, timeLeft: Math.max(0, S.left) }; },
    destroy() { dead = true; cancelAnimationFrame(raf); listeners.forEach((f) => f()); renderer.dispose(); scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); root.remove(); },
    _debug: { spawn, openSheet, answer: (k) => answer(k, sheet.querySelector(`[data-o="${k}"]`)), step: frame, S, PS, finish },
  };

}
global.GrrrCareGame = { mount: mount, version: VERSION };
if (typeof module !== "undefined" && module.exports) module.exports = global.GrrrCareGame;
})(typeof window !== "undefined" ? window : this);
