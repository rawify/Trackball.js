# Trackball.js - 3D Trackballs for your Website

[![NPM Package](https://img.shields.io/npm/v/trackball.svg?style=flat)](https://npmjs.org/package/trackball "View this project on npm")
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

Trackball.js is a small JavaScript library on top of [Quaternion.js](https://github.com/rawify/Quaternion.js) to enable free 3D rotation of elements using CSS3 transforms that feels naturally by using the mouse or touch.

<p align="center">
<img src="https://github.com/rawify/Trackball.js/blob/main/res/cube.png?raw=true" width="300">
</p>

The library does no styling or anything to the DOM, it handles the user action and calculates the transformation you should apply. But this way you have much more freedom on perspective, what elements should rotate and what additional transforms should be applied to the element.

If you are interested in the math behind this library or want to see a demo, take a look at the [derivation of the trackball](https://raw.org/article/trackball-rotation-using-quaternions/).


## Example

The usage of Trackball.js is pretty straightforward. Create a scene that should handle the input and put a object with 3D transforms in it:


```html
<div id="scene">
  <div id="object">
  	<div class="side"></div>
  	...
  </div>
</div>
```

The scene and the object get styling to prepare it for 3D rotation:

```html
<style type="text/css">
#scene {
  width: 400px;
  height: 400px;
  touch-action: none;
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

And for each side translate it in 3D to form the object you want using CSS3 transforms, like for example:

```css
transform: rotateY(90deg) translateZ(100px);
```

Now to apply Trackball.js, simply run

```js
<script src="quaternion.js"></script>
<script src="trackball.js"></script>

<script>

let obj = document.getElementById("object");
let tr = new Trackball({
   scene: "#scene", // Selector to apply trackball on
   q: new Quaternion, // Initial rotation
   smooth: true, // Smoothly roll out after a drag impulse was applied
   limitAxis: null, // Pass "x" or "y" if rotation should be limited to one axis
   onDraw: function(q) {
    obj.style.transform = q.toCSSTransform();
   }
});

</script>
```

The good thing about the callback approach is, that you have full control over the styling. You can use the passed quaternion and transform it further or even use it in another way than CSS transforms.

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

## Functions


void rotate(Quaternion by)
---
If no interaction is present, `rotate()` changes the current orientation by the given quaternion



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

Copyright (c) 2024, [Robert Eisele](https://raw.org/)
Licensed under the MIT license.
