# Trackball.js - 3D Trackballs for your Website

Trackball.js is a small JavaScript library on top of [Quaternion.js](https://github.com/infusion/Quaternion.js) to enable free 3D rotation of elements using CSS3 transforms that feels naturally by using the mouse or touch.

<p align="center">
<img src="https://github.com/infusion/Trackball.js/blob/main/res/cube.png?raw=true" width="300">
</p>

The library does no styling or anything to the DOM, it handles the user action and calculates the transformation you should apply. But this way you have much more freedom on perspective, what elements should rotate and what additional transforms should be applied to the element.

If you are interested in the math behind this library or want to see a demo, take a look at the [derivation of the trackball](https://www.xarg.org/2021/07/trackball-rotation-using-quaternions/).


## Usage

The usage is pretty straightforward. Create a scene that should handle the input and put a object with 3D transforms in it:


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
   impulse: true, // Smoothly roll out after a drag impulse was applied
   limitAxis: null, // Pass "x" or "y" if rotation should be limited to one axis
});

tr.on("draw", function(q) {
  obj.style.transform = "matrix3d(" + q.toMatrix4() + ")";
});

</script>
```

The good thing about the callback approach is, that you have full control over the styling. You can use the passed quaternion and transform it further or even use it in another way than CSS transforms.


Coding Style
===
As every library I publish, Trackball.js is also built to be as small as possible after compressing it with Google Closure Compiler in advanced mode. Thus the coding style orientates a little on maxing-out the compression rate. Please make sure you keep this style if you plan to extend the library.

Copyright and licensing
===
Copyright (c) 2021, [Robert Eisele](https://www.xarg.org/)
Licensed under the MIT license.
