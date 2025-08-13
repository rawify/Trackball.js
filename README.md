# Trackball.js - 3D Trackballs for your Website

[![NPM Package](https://img.shields.io/npm/v/trackball.svg?style=flat)](https://npmjs.org/package/trackball "View this project on npm")
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

Trackball.js is a small JavaScript library on top of [Quaternion.js](https://github.com/rawify/Quaternion.js) that enables natural, free 3D rotation of DOM elements via CSS transforms. The library **does not style** your DOM – it just handles user input and gives you a quaternion that you apply to your object.

<p align="center">
<img src="https://github.com/rawify/Trackball.js/blob/main/res/cube.png?raw=true" width="300">
</p>

If you are interested in the math behind this library or want to see a demo, take a look at the [derivation of the trackball](https://raw.org/article/trackball-rotation-using-quaternions/).


## Example

The usage of Trackball.js is pretty straightforward. Create a scene that should handle the input and put a object with 3D transforms in it:

```html
<div id="scene">
  <div id="object">
    <div class="side"></div>
    <!-- ... -->
  </div>
</div>
```

Basic styles:

```html
<style>
#scene {
  width: 400px;
  height: 400px;
  touch-action: none; /* important for touch */
  perspective: 500px;
  position: relative;
}

#object {
  width: 200px;
  height: 200px;
  margin: 100px;
  transform-style: preserve-3d;
  box-sizing: border-box;
}

.side {
  width: 200px;
  height: 200px;
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
}
</style>
```

Usage:

```html
<script src="/path/to/quaternion.min.js"></script>
<script src="/path/to/trackball.min.js"></script>
<script>
  const obj = document.getElementById('object');

  const tb = new Trackball({
    scene: '#scene',
    q: new Quaternion(),             // initial rotation
    inertia: true,                   // enable inertia (defaults shown below)
    limitAxis: null,                 // 'x' | 'y' | null
    onDraw(q) {
      // apply q (Quaternion) to your view matrix / object here
      // e.g., shader uniform from q.toMatrix4() if your lib supports it
      obj.style.transform = q.toCSSTransform();
    }
  });
</script>
```

Limit interaction to a **bounding box** inside the scene:

```js
const bbox = document.getElementById('object');
const tb = new Trackball({
  scene: '#scene',
  activeArea: () => bbox.getBoundingClientRect(),
  areaPolicy: 'start-inside', // start inside, keep rotating if pointer leaves
  inertia: { damping: 0.93 },
  onDraw(q) { obj.style.transform = q.toCSSTransform(); }
});
```

Programmatic rotation (when idle):

```js
const tick = () => {
  if (!tb.inertiaID && !tb.drag) {
    tb.rotate(Quaternion.fromAxisAngle([0,1,0], Math.PI/180));
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
```

## Installation

You can install `Trackball.js` via npm:

```bash
npm install trackball
```

Or with yarn:

```bash
yarn add trackball
```

Alternatively, download or clone the repository:

```bash
git clone https://github.com/rawify/Trackball.js
```

## Usage

Include the `trackball.min.js` file in your project:

```html
<script src="path/to/trackball.min.js"></script>
<script>
  const cm = new Trackball();
  ...
</script>
```

Or in a Node.js project:

```javascript
const Trackball = require('trackball');
```

or

```javascript
import Trackball from "trackball";
```

## API

### `new Trackball(options)`

**Required**

* `scene: HTMLElement | string` – host element or CSS selector that receives interaction.

**Common**

* `q: Quaternion` *(default: `Quaternion.ONE`)* – initial orientation.
* `onDraw(q)` – called every time orientation changes.
* `onStart(q)` – called when a drag/press starts.
* `onEnd(q)` – called on release, or when inertia finishes.
* `enabled: boolean` *(default: `true`)* – enable/disable interaction.
* `limitAxis: 'x'|'y'|null` *(default: `null`)* – lock one axis if desired.
* `invertX: boolean` *(default: `false`)* – invert X motion.
* `invertY: boolean` *(default: `false`)* – invert Y motion.
* `speed: number` *(default: `1`)* – motion multiplier.
* `ballsize: number` *(default: `0.75`)* – **relative** ball radius (fraction of the active rect’s larger side).
* `border: number` *(default: `0.5`)* – rounded-arcball rim amount (0 = pure sphere, 0.5 = pleasant rim).

**Active area**

* `activeArea: HTMLElement | string | DOMRect | () => DOMRect | {left,top,width,height}` *(default: `null`)* – restricts interaction.
* `areaPolicy: 'inside-only'|'start-inside'|'always'` *(default: `'inside-only'`)* – update rules vs. the active box.

**Pointer options**

* `usePointerCapture: boolean` *(default: `true`)* – improves robustness while dragging.
* `passiveMove: boolean` *(default: `true`)* – passive `pointermove` listener.

**Inertia**

* `inertia: boolean | { damping?: number, maxStep?: number, minVelocity?: number, timeDiv?: number }`

  * If `true`, uses defaults below.
  * **Defaults:** `{ damping: 0.93, maxStep: 0.2, minVelocity: 1e-3, timeDiv: 50 }`

### Methods

* `rotate(by: Quaternion)` – multiply current orientation by `by` (only when not dragging and no inertia).
* `setQuaternion(q: Quaternion)` – replace orientation immediately.
* `setActiveArea(area)` – change the active area at runtime.
* `setEnabled(boolean)` – enable/disable interaction.
* `dispose()` – remove listeners and stop inertia.


## Notes

* Trackball.js only computes the quaternion. Apply it to your object any way you like, e.g. `q.toCSSTransform()`.
* To restrict to a sub-rect of the scene, provide `activeArea` (element, selector, rect, or function).

## Coding Style

As every library I publish, Trackball.js is also built to be as small as possible after compressing it with Google Closure Compiler in advanced mode. Thus the coding style orientates a little on maxing-out the compression rate. Please make sure you keep this style if you plan to extend the library.

## Building the library

After cloning the Git repository run:

```
npm install
npm run build
```

## Run a test

Testing the source against the shipped test suite is as easy as

```
npm run test
```

## Copyright and Licensing

Copyright (c) 2025, [Robert Eisele](https://raw.org/)
Licensed under the MIT license.
