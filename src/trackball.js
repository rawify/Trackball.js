/**
 * @license Trackball.js v1.3.1 8/16/2025
 * https://raw.org/article/trackball-rotation-using-quaternions/
 *
 * Copyright (c) 2025, Robert Eisele (https://raw.org/)
 * Licensed under the MIT license.
 **/

import Quaternion from 'quaternion';

// Constructor
function Trackball(opts) {

  if (!opts) opts = {};
  if (opts['nodeType']) opts = { 'scene': opts };
  if (typeof opts['scene'] === 'string') opts['scene'] = document.querySelector(opts['scene']);

  const scene = opts['scene'];
  if (!scene) throw new Error('[Trackball] opts.scene is required');

  this['opts'] = {
    'onDraw': typeof opts['onDraw'] === 'function' ? opts['onDraw'] : function () { },
    'onStart': typeof opts['onStart'] === 'function' ? opts['onStart'] : function () { },
    'onEnd': typeof opts['onEnd'] === 'function' ? opts['onEnd'] : function () { },
    'enabled': opts['enabled'] !== false,
    'limitAxis': opts['limitAxis'] ?? null,
    'invertX': !!opts['invertX'],
    'invertY': !!opts['invertY'],
    'speed': opts['speed'] ?? 1,
    'ballsize': opts['ballsize'] ?? 0.75,
    'border': opts['border'] ?? 0.5,
    'inertia': (typeof opts['inertia'] === 'object' || opts['inertia'] === true) ? (opts['inertia'] || {}) : false,
    'usePointerCapture': opts['usePointerCapture'] !== false,
    'passiveMove': opts['passiveMove'] !== false,
    'activeArea': opts['activeArea'] ?? null,
    'areaPolicy': opts['areaPolicy'] || 'inside-only'
  };

  this['scene'] = scene;
  this['q'] = this['p'] = opts['q'] || Quaternion['ONE']; // current & base

  // Bind handlers to instance
  this['_onPointerDown'] = onPointerDown.bind(this);
  this['_onPointerMove'] = onPointerMove.bind(this);
  this['_onPointerUp'] = onPointerUp.bind(this);

  // Events
  this['scene'].addEventListener('pointerdown', this['_onPointerDown'], { 'passive': true });
  document.addEventListener('pointermove', this['_onPointerMove'], { 'passive': !!this['opts']['passiveMove'] });
  document.addEventListener('pointerup', this['_onPointerUp'], { 'passive': true });
  document.addEventListener('pointercancel', this['_onPointerUp'], { 'passive': true });

  // Initial draw
  draw.call(this);
}

Trackball['prototype'] = {
  'scene': null,
  'opts': null,
  'drag': null, // { startVec: [x,y,z], startPos: [x,y], rect: DOMRect }
  'rafPending': false,
  'lastPointer': null, // { x, y }
  'inertiaID': 0,
  'velocityAxis': null, // [x,y,z] unit axis
  'velocity': 0, // rad/frame
  'q': null,
  'p': null,
  'angleChange': 0,
  'angle': 0,
  'spinAxis': null,
  'spinBase': null,
  't0': 0,
  't1': 0,
  'lastDQ': null,
  '_onPointerDown': null,
  '_onPointerMove': null,
  '_onPointerUp': null,

  'rotate': function (by) { // Programmatic rotation: q := q * by (only when idle)
    if (!this['drag'] && !this['inertiaID']) {
      this['q'] = this['p'] = this['p']['mul'](by);
      draw.call(this);
    }
  },
  'setQuaternion': function (q) { // Replace orientation immediately
    stopInertia.call(this);
    this['drag'] = null;
    this['q'] = this['p'] = q;
    draw.call(this);
  },
  'setActiveArea': function (area) { // Update the active interaction area
    this['opts']['activeArea'] = area;
  },
  'setEnabled': function (v) { // Enable/disable interaction
    this['opts']['enabled'] = !!v;
  },
  'dispose': function () { // Cleanup
    stopInertia.call(this);
    this['scene'].removeEventListener('pointerdown', this['_onPointerDown']);
    document.removeEventListener('pointermove', this['_onPointerMove']);
    document.removeEventListener('pointerup', this['_onPointerUp']);
    document.removeEventListener('pointercancel', this['_onPointerUp']);
  }
};

// === Private (module-local) helpers ===
function onPointerDown(ev) {
  if (!this['opts']['enabled']) return;

  const rect = getActiveRect.call(this);
  const inside = inRect(ev['clientX'], ev['clientY'], rect);
  if (!inside && this['opts']['areaPolicy'] !== 'always') return;

  stopInertia.call(this);
  this['velocity'] = 0;
  this['velocityAxis'] = null;
  this['t0'] = this['t1'] = performance.now();
  this['lastDQ'] = null;

  if (this['opts']['usePointerCapture'] && ev['target'] && 'setPointerCapture' in ev['target']) {
    try { ev['target']['setPointerCapture'](ev['pointerId']); } catch (e) { }
  }

  const startVec = project.call(this, ev['clientX'], ev['clientY'], rect);

  this['drag'] = {
    'startVec': startVec,
    'prevVec': startVec,
    'startPos': [ev['clientX'], ev['clientY']],
    'rect': rect
  };
  this['p'] = this['q'];
  this['lastPointer'] = { 'x': ev['clientX'], 'y': ev['clientY'] };
  this['opts']['onStart'] && this['opts']['onStart'](this['q']);
  draw.call(this);
}

function onPointerMove(ev) {
  if (!this['drag']) return;
  this['lastPointer'] = { 'x': ev['clientX'], 'y': ev['clientY'] };
  if (!this['rafPending']) {
    this['rafPending'] = true;
    requestAnimationFrame(tick.bind(this));
  }
}

function onPointerUp(ev) {
  if (!this['drag']) return;

  // Capture release time for inertia dt
  this['t1'] = performance.now();

  const rect = this['drag']['rect'];
  const inside = inRect(ev['clientX'], ev['clientY'], rect);
  if (this['opts']['areaPolicy'] !== 'inside-only' || inside) {
    updateFromPointer.call(this, ev['clientX'], ev['clientY']);
  }

  // Commit the drag result so subsequent programmatic rotate() composes correctly
  this['p'] = this['q'];
  this['drag'] = null;

  if (this['opts']['inertia']) {
    const cfg = this['opts']['inertia'] || {};
    startInertia.call(this, cfg['damping'] ?? 0.93, cfg['minVelocity'] ?? 1e-3, cfg['maxStep'] ?? 0.2, cfg['timeDiv'] ?? 50);
    return; // onEnd will be fired when inertia stops
  }

  this['opts']['onEnd'] && this['opts']['onEnd'](this['q']);
  draw.call(this);
}

function tick() {
  this['rafPending'] = false;
  if (!this['drag'] || !this['lastPointer']) return;

  const x = this['lastPointer']['x'];
  const y = this['lastPointer']['y'];

  const rect = this['drag']['rect'];
  const inside = inRect(x, y, rect);
  if (this['opts']['areaPolicy'] === 'inside-only' && !inside) return;

  const dynamicRect = maybeRefreshRect.call(this);
  if (dynamicRect) this['drag']['rect'] = dynamicRect;

  updateFromPointer.call(this, x, y);
  draw.call(this);
}

function updateFromPointer(clientX, clientY) {

  const rect = this['drag']['rect'];

  // Apply optional inversion relative to drag start
  const invX = this['opts']['invertX'] ? (2 * this['drag']['startPos'][0] - clientX) : clientX;
  const invY = this['opts']['invertY'] ? (2 * this['drag']['startPos'][1] - clientY) : clientY;

  const cur = project.call(this, invX, invY, rect);

  // Absolute delta from drag-start controls orientation (keeps prior feel)
  const dqAbs = Quaternion['fromVectors'](this['drag']['startVec'], cur);
  this['q'] = dqAbs['mul'](this['p']);
  this['lastDQ'] = dqAbs;
  this['drag']['prevVec'] = cur;
}

function startInertia(damping, minVelocity, maxStep, timeDiv) {
  if (this['inertiaID']) cancelAnimationFrame(this['inertiaID']);

  // Use the last drag delta (from startVec -> last cur) like v1 did
  const dq = this['lastDQ'];
  if (!dq) return;

  // Angle and axis from dq
  const w = Math.max(-1, Math.min(1, dq['w']));
  const dw = 2 * Math.acos(w);
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  const axis = s > 1e-12 ? [dq['x'] / s, dq['y'] / s, dq['z'] / s] : [0, 0, 1];

  // Time scaling like v1: dt = max((Δt)/timeDiv, 1)
  const dt = Math.max((this['t1'] - this['t0']) / (timeDiv || 50), 1);

  // Initial per-frame step (bounded)
  this['angleChange'] = Math.min(maxStep || 0.2, Math.abs(dw / dt));
  if (!(this['angleChange'] > 0)) return;

  this['angle'] = 0;
  this['spinAxis'] = axis;
  this['spinBase'] = this['p']; // base orientation at release

  const self = this;
  function slide() {
    self['angle'] += self['angleChange'];
    self['angleChange'] *= (damping || 0.93);

    self['q'] = Quaternion['fromAxisAngle'](self['spinAxis'], self['angle'])['mul'](self['spinBase']);
    draw.call(self);

    if (self['angleChange'] < minVelocity) {
      stopInertia.call(self);
      self['p'] = self['q'];
      self['opts']['onEnd'] && self['opts']['onEnd'](self['q']);
    } else {
      self['inertiaID'] = requestAnimationFrame(slide);
    }
  }
  this['inertiaID'] = requestAnimationFrame(slide);
}

function stopInertia() {
  if (this['inertiaID']) cancelAnimationFrame(this['inertiaID']);
  this['inertiaID'] = 0;
  this['velocity'] = 0;
  this['velocityAxis'] = null;
}

function draw() {
  this['opts']['onDraw'] && this['opts']['onDraw'](this['q']);
}

function getActiveRect() {
  const area = this['opts']['activeArea'];
  if (!area) return this['scene']['getBoundingClientRect']();
  if (typeof area === 'function') return toDOMRect(area());
  if (typeof area === 'string') {
    const el = document['querySelector'](area);
    return el && el instanceof HTMLElement ? el['getBoundingClientRect']() : this['scene']['getBoundingClientRect']();
  }
  if (area instanceof HTMLElement) return area['getBoundingClientRect']();
  return toDOMRect(area);
}

function maybeRefreshRect() {
  const area = this['opts']['activeArea'];
  if (typeof area === 'function' || area instanceof HTMLElement || typeof area === 'string') return getActiveRect.call(this);
  return null;
}

function toDOMRect(r) {
  if (!r) return document.body.getBoundingClientRect();
  if (typeof DOMRect !== 'undefined' && r instanceof DOMRect) return r;
  const left = r['left'] ?? r['x'] ?? 0;
  const top = r['top'] ?? r['y'] ?? 0;
  const width = r['width'] ?? 0;
  const height = r['height'] ?? 0;
  const right = left + width;
  const bottom = top + height;
  return { 'left': left, 'top': top, 'right': right, 'bottom': bottom, 'width': width, 'height': height, 'x': left, 'y': top, 'toJSON': function () { return this; } };
}

function inRect(x, y, r) {
  return x >= r['left'] && x <= r['right'] && y >= r['top'] && y <= r['bottom'];
}

// Maps client coords to unit hemisphere with rounded rim, controlled by 'border' and 'ballsize'.
function project(clientX, clientY, rect) {
  const maxDim = Math.max(rect['width'], rect['height']) - 1;

  // Map to [-1, 1] in local rect space
  let x = (2 * (clientX - rect['left']) - rect['width'] - 1) / maxDim;
  let y = (2 * (clientY - rect['top']) - rect['height'] - 1) / maxDim;

  // Axis limiting & ball size
  if (this['opts']['limitAxis'] === 'x') x = 0; else x /= this['opts']['ballsize'];
  if (this['opts']['limitAxis'] === 'y') y = 0; else y /= this['opts']['ballsize'];

  const border = this['opts']['border'];
  const ra = 1 + border; // outer radius
  const a = border * (1 + border / 2);
  const ri = 2 / (ra + 1 / ra);

  const dist2 = (x * x + y * y) * (ra * ra);
  const dist = Math.sqrt(dist2);

  if (dist < ri) return [x, y, Math.sqrt(1 - dist2)];
  if (dist < ra) {
    const dr = ra - dist;
    return [x, y, a - Math.sqrt((a + dr) * (a - dr))];
  }
  return [x, y, 0];
}

// === Example usage ===
/*
const tb = new Trackball({
  'scene': '.scene',
  'q': Quaternion.random(),
  'inertia': { 'damping': 0.92, 'minVelocity': 1e-3 },
  'limitAxis': null,
  'areaPolicy': 'start-inside',
  'border': 0.5,
  'ballsize': 0.75,
  'onDraw': function(q) {
    // apply q (Quaternion) to your view matrix / object here
    // e.g., shader uniform from q.toMatrix4() if your lib supports it
    document.querySelector('.cube').style.transform = q.toCSSTransform();
  }
});

const inc = Quaternion.fromAxisAngle([Math.random(), Math.random(), Math.random()], 1/100);
(function loop(){
  tb['rotate'](inc);
  requestAnimationFrame(loop);
})();
*/
