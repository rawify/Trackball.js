/**
 * @license Trackball.js v1.0.0 26/06/2021
 *
 * Copyright (c) 2021, Robert Eisele (robert@xarg.org)
 * Licensed under the MIT license.
 **/
(function (root) {

  'use strict';

  /**
   * 
   * @constructor
   */
  function Trackball(opts) {

    var self = this;

    // Last constructed vector on the hemi-sphere
    var lastVector = null;

    // Slide timing and angle difference
    var oldTime = 0, curTime = 0;
    var angleChange = 0;

    // Axis-Angle form for sliding
    var axis = null;
    var angle = 0;

    var events = self['events'] = [];

    if (!opts) {
      opts = {};
    }

    if (opts.nodeType) {
      opts = { "scene": opts };
    }

    if (typeof opts['scene'] === 'string') {
      opts['scene'] = document.querySelector(opts['scene']);
    }

    self['opts'] = opts;

    self['p'] = self['q'] = opts['q'] || Quaternion['ONE'];

    var scene = opts['scene'];

    self['loop'] = function () {

      for (var i = 0; i < events.length; i++) {
        if (events[i]['type'] === 'draw')
          events[i]['cb'].call(self, self['q']);
      }
    };

    function mousedown(ev) {
      if (angleChange !== 0) { stopSlide(); }

      var box = scene.getBoundingClientRect();

      oldTime = curTime = performance.now()

      lastVector = self._project(ev['clientX'], ev['clientY'], box);

      self['drag'] = {
        "startVector": lastVector,
        "box": box
      };
      requestAnimationFrame(self['loop']);
    }

    function mousemove(ev) {
      if (self['drag'] === null) return;

      oldTime = curTime;
      curTime = performance.now();

      lastVector = self._project(ev['clientX'], ev['clientY'], self['drag']['box']);

      var q = Quaternion['fromBetweenVectors'](self['drag']['startVector'], lastVector);

      self['q'] = self['p']['mul'](q);

      requestAnimationFrame(self['loop']);
    }

    function mouseup(ev) {
      if (self['drag'] === null) return;

      oldTime = curTime;
      curTime = performance.now();

      lastVector = self._project(ev['clientX'], ev['clientY'], self['drag']['box']);

      var q = Quaternion['fromBetweenVectors'](self['drag']['startVector'], lastVector);

      self['p'] = self['q'] = self['p']['mul'](q);

      self['drag'] = null;

      // Calc speed
      var dw = 2 * Math.acos(q['w']);
      var dt = Math.max(curTime - oldTime, 1);
      angleChange = Math.min(0.2, Math.abs(dw / dt));

      if (self['opts']['smooth'] && angleChange > 0) {

        axis = [q['x'], q['y'], q['z']];
        angle = 0;

        self['slideID'] = requestAnimationFrame(smoothSlide);
      } else {
        requestAnimationFrame(self['loop']);
      }
    }

    function smoothSlide() {

      angle += angleChange;
      angleChange *= 0.93;

      self['q'] = self['p']['mul'](Quaternion['fromAxisAngle'](axis, angle));

      self['loop']();

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

    requestAnimationFrame(self['loop']);
  }

  Trackball.prototype = {
    "events": null,
    "p": null,
    "q": null,
    "opts": null,
    "slideID": null,
    "drag": null,
    "on": function (type, cb) {
      this['events'].push({ "type": type, "cb": cb });
    },
    "off": function (type, cb) {
      var ev = this['events'];
      for (var i = ev.length - 1; i >= 0; i--) {
        if (ev[i]['type'] === type && ev[i]['cb'] === cb) {
          ev.splice(i, 1);
        }
      }
    },
    _project: function (x, y, box) {

      var r = 1;

      var res = Math.min(box['width'], box['height']) - 1;

      // map to -1 to 1
      x = (2 * (x - box['x']) - box['width'] - 1) / res;
      y = (2 * (y - box['y']) - box['height'] - 1) / res;

      if (this['opts']['limitAxis'] === 'x') y = 0;
      if (this['opts']['limitAxis'] === 'y') x = 0;

      var dist2 = x * x + y * y;

      if (dist2 <= r * r / 2)
        var z = Math.sqrt(r * r - dist2);
      else
        var z = r * r / 2 / Math.sqrt(dist2);

      return [-x, -y, z]
    },
    "rotate": function (by) {
      if (!this['drag'] && !this['slideID']) {
        this['q'] = this['p'] = this['p']['mul'](by);
        requestAnimationFrame(this['loop']);
      }
    }
  };

  if (typeof define === 'function' && define['amd']) {
    define([], function () {
      return Trackball;
    });
  } else if (typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { 'value': true });
    Quaternion['default'] = Trackball;
    Quaternion['Trackball'] = Trackball;
    module['exports'] = Trackball;
  } else {
    root['Trackball'] = Trackball;
  }

})(this);
