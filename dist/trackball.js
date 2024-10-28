'use strict';
const Quaternion = require('quaternion');



/**
 * 
 * @constructor
 */
function Trackball(opts) {

  var self = this;

  // Slide timing and angle difference
  var oldTime = 0, curTime = 0;
  var angleChange = 0;

  // Axis-Angle form for sliding
  var axis = null;
  var angle = 0;

  if (!opts) {
    opts = {};
  }

  if (opts.nodeType) {
    opts = { "scene": opts };
  }

  if (typeof opts['scene'] === 'string') {
    opts['scene'] = document.querySelector(opts['scene']);
  }

  if (!opts['onDraw']) {
    opts['onDraw'] = function () { };
  }

  self['opts'] = opts;

  self['p'] = self['q'] = opts['q'] || Quaternion['ONE'];

  var scene = opts['scene'];

  self['_doDraw'] = function () {
    opts['onDraw'].call(self, self['q']);
  };

  function mousedown(ev) {
    if (angleChange !== 0) { stopSlide(); }

    var box = scene.getBoundingClientRect();

    var lastVector = self._project(ev['clientX'], ev['clientY'], box);

    oldTime = curTime = performance.now();

    self['drag'] = {
      "startVector": lastVector,
      "box": box
    };
    requestAnimationFrame(self['_doDraw']);
  }

  function mousemove(ev) {
    if (self['drag'] === null) return;

    //oldTime = curTime;
    //curTime = performance.now();

    var lastVector = self._project(ev['clientX'], ev['clientY'], self['drag']['box']);

    var q = Quaternion['fromVectors'](self['drag']['startVector'], lastVector);

    self['q'] = q['mul'](self['p']);

    requestAnimationFrame(self['_doDraw']);
  }

  function mouseup(ev) {
    if (self['drag'] === null) return;

    oldTime = curTime;
    curTime = performance.now();

    var lastVector = self._project(ev['clientX'], ev['clientY'], self['drag']['box']);

    var q = Quaternion['fromVectors'](self['drag']['startVector'], lastVector);

    self['p'] = self['q'] = q['mul'](self['p']);

    self['drag'] = null;

    if (self['opts']['smooth']) {

      // Calc speed
      var dw = 2 * Math.acos(q['w']);
      var dt = Math.max((curTime - oldTime) / 50, 1);
      angleChange = Math.min(0.2, Math.abs(dw / dt));

      if (angleChange > 0) {

        axis = [q['x'], q['y'], q['z']];
        angle = 0;

        self['slideID'] = requestAnimationFrame(smoothSlide);
        return;
      }
    }
    requestAnimationFrame(self['_doDraw']);
  }

  function smoothSlide() {

    angle += angleChange;
    angleChange *= 0.93;

    self['q'] = Quaternion['fromAxisAngle'](axis, angle)['mul'](self['p']);

    self['_doDraw']();

    if (angleChange < 1e-3) {
      stopSlide();
    } else {
      self['slideID'] = requestAnimationFrame(smoothSlide);
    }
  }

  function stopSlide() {
    cancelAnimationFrame(self['slideID']);

    self['p'] = self['q'];
    self['slideID'] = null;

    angleChange = 0;
  }

  scene.addEventListener('mousedown', mousedown, { "passive": true });
  document.addEventListener('mousemove', mousemove, { "passive": true });
  document.addEventListener('mouseup', mouseup, { "passive": true });

  scene.addEventListener('touchstart', function (ev) { ev.preventDefault(); if (ev.touches.length === 1) mousedown(ev.touches[0]); }, { "passive": false });
  document.addEventListener('touchmove', function (ev) { if (ev.changedTouches.length === 1) mousemove(ev.changedTouches[0]); }, { "passive": true });
  document.addEventListener('touchend', function (ev) { if (ev.changedTouches.length === 1) mouseup(ev.changedTouches[0]); }, { "passive": true });

  requestAnimationFrame(self['_doDraw']);
}

Trackball.prototype = {
  "p": null,
  "q": null,
  "opts": null,
  "slideID": null,
  "drag": null,
  _project: function (x, y, box) {

    var r = 1;

    var res = Math.max(box['width'], box['height']) - 1;

    // map to -1 to 1
    if (this['opts']['limitAxis'] === 'x') x = 0;
    else x = (2 * (x - box['x']) - box['width'] - 1) / res;
    if (this['opts']['limitAxis'] === 'y') y = 0;
    else y = (2 * (y - box['y']) - box['height'] - 1) / res;

    var dist2 = x * x + y * y;

    if (2 * dist2 <= r * r)
      return [x, y, Math.sqrt(r * r - dist2)];
    else
      return [x, y, r * r / 2 / Math.sqrt(dist2)];
  },
  "rotate": function (by) {
    if (!this['drag'] && !this['slideID']) {
      this['q'] = this['p'] = this['p']['mul'](by);
      requestAnimationFrame(this['_doDraw']);
    }
  }
};

Object.defineProperty(Trackball, "__esModule", { 'value': true });
Trackball['default'] = Trackball;
Trackball['Trackball'] = Trackball;
module['exports'] = Trackball;
