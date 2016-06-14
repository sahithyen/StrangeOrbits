/**
 *
 * @name StrangeOrbits
 *
 * @author Sahithyen Kanaganayagam - @sahithyen
 * @version 1.0.0
 *
 * @description Creates a canvas with figures out of points from an image
 *
 * @license GNU GPL v3
 *
 * Copyright (C) 2015 Sahithyen Kanaganayagam (mail@sahithyen.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 **/

(function(definition) {
  'use strict';

  if (typeof exports === 'object') {
    module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    define('StrangeOrbits', [], definition);
  } else {
    window.StrangeOrbits = definition();
  }
})(function() {
  'use strict';

  var StrangeOrbits = function(element, costumOptions) {
    // Constants
    var TWO_PI = Math.PI * 2;

    /**
     * Local variables
     **/
    var
      paused = true,
      pointerPos = {
        x: null,
        y: null
      },
      mouseDown = false,
      isTouched = false,
      figurePoints = [],
      animationQueue = [],
      currentAnimation = null,
      actualImage = null,
      elW,
      elH,
      canvas,
      ctx,
      vCanvas,
      vCtx,
      lastFrameTime,
      animationFrameRequest,
      options;

    /**
     * Public variables
     **/

    this.options = options = {
      color: '#FFFFFF',
      pointDensity: 0.0075,
      minParticleRadius: 1,
      maxParticleRadius: 3,
      minParticleOpacity: 0.15,
      maxParticleOpacity: 0.85,
      minTrembleOffset: 10,
      maxTrembleOffset: 20,
      minTrembleDuration: 250,
      maxTrembleDuration: 750,
      pointForceActivated: true,
      pointForceRadius: 60,
      clickedMouseForceActivated: true,
      clickedMouseForceRadius: 90,
      animationEasings: {
        'ease': new BezierEasing(0.25, 0.1, 0.25, 1.0),
        'linear': new BezierEasing(0.00, 0.0, 1.00, 1.0),
        'ease-in': new BezierEasing(0.42, 0.0, 1.00, 1.0),
        'ease-out': new BezierEasing(0.00, 0.0, 0.58, 1.0),
        'ease-in-out': new BezierEasing(0.42, 0.0, 0.58, 1.0),
        'strange': new BezierEasing(0.7, 0, 0.3, 1)
      }
    };
    options.__defineGetter__('backgroundColor', function() {
      return element.style.backgroundColor;
    });
    options.__defineSetter__('backgroundColor', function(color) {
      element.style.backgroundColor = color;
    });

    /**
     * Constructor
     **/

    var init = function() {
      // Initializes local variables
      canvas = document.createElement('canvas');
      element.appendChild(canvas);
      ctx = canvas.getContext('2d');

      vCanvas = document.createElement('canvas');
      vCtx = vCanvas.getContext('2d');

      // Initializes public variables
      options.backgroundColor = '#080808';

      if (typeof costumOptions === "object") {
        for (var key in costumOptions) {
          options[key] = costumOptions[key];
        }
      }

      // Resizes canvas
      resizeCanvas();

      // Adds event listeners
      window.addEventListener('resize', resizeCanvas);
      element.addEventListener("mousemove", changeMousePos);
      element.addEventListener("mousedown", mouseButtonPressed);
      element.addEventListener("mouseup", mouseButtonReleased);
      element.addEventListener("touchstart", touchStarted);
      element.addEventListener("touchmove", changeTouchPos);
      element.addEventListener("touchend", touchEnded);
      element.addEventListener("touchcancel", touchEnded);
    }.bind(this);

    /**
     * Public functions
     **/

    // Starts animation
    this.start = function() {
      paused = false;
      lastFrameTime = Date.now();
      animationFrameRequest = requestAnimationFrame(frame);
    };

    // Stops animation
    this.stop = function() {
      paused = true;
    };

    // Shows a figur
    this.showFigure = function(url, duration, easing, callback) {
      animationQueue.push({
        type: 'showFigure',
        clock: 0,
        ready: false,
        duration: duration,
        easing: typeof easing === "undefined" ? "strange" : easing,
        callback: callback,
        properties: {
          url: url
        }
      });
    };

    // Lets the figur disappear
    this.hideFigure = function(duration, easing, callback) {
      animationQueue.push({
        type: 'hideFigure',
        clock: 0,
        ready: true,
        duration: duration,
        easing: typeof easing === "undefined" ? "strange" : easing,
        callback: callback
      });
    }.bind(this);

    /**
     * Private functions
     **/

    // Handles resizing
    var resizeCanvas = function() {
      elW = element.offsetWidth;
      elH = element.offsetHeight;

      var devicePixelRatio = window.devicePixelRatio || 1;
      var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;

      var ratio = devicePixelRatio / backingStoreRatio;

      canvas.width = elW * ratio;
      canvas.height = elH * ratio;

      canvas.style.width = elW + 'px';
      canvas.style.height = elH + 'px';

      ctx.scale(ratio, ratio);

      vCtx.canvas.width = elW;
      vCtx.canvas.height = elH;

      if (actualImage !== null) {
        setFigure(actualImage, function() {
          removeOffscreenFigurePoints();
        }.bind(this));
      }
    }.bind(this);

    // Handles mouse position changes
    var changeMousePos = function(event) {
      isTouched = true;

      pointerPos.x = event.clientX;
      pointerPos.y = event.clientY;
    }.bind(this);

    // Handles a mouse button press
    var mouseButtonPressed = function() {
      mouseDown = true;
    }.bind(this);

    // Handles a mouse button release
    var mouseButtonReleased = function() {
      mouseDown = false;
    }.bind(this);

    // Handles touch position changes
    var changeTouchPos = function(event) {
      pointerPos.x = event.changedTouches[0].clientX;
      pointerPos.y = event.changedTouches[0].clientY;
    }.bind(this);

    // Handles a started touch event
    var touchStarted = function() {
      isTouched = true;
    }.bind(this);

    // Handles an ended touch event
    var touchEnded = function() {
      isTouched = false;
    }.bind(this);

    // Creates the next frame
    var frame = function() {
      var now, deltaTime, moveFactor, i, point, color;

      now = Date.now();
      deltaTime = now - lastFrameTime;
      lastFrameTime = now;

      moveFactor = updateAnimation(deltaTime);

      ctx.clearRect(0, 0, elW, elH);
      ctx.fillStyle = options.color;

      for (i = 0; i < figurePoints.length; i++) {
        figurePoints[i].update(moveFactor, deltaTime);

        point = figurePoints[i];

        ctx.beginPath();
        ctx.arc(point.position.x, point.position.y, point.radius, 0, TWO_PI);
        ctx.closePath();

        ctx.globalAlpha = point.opacity;
        ctx.fill();
      }

      if (!paused) {
        animationFrameRequest = requestAnimationFrame(frame);
      }
    }.bind(this);

    // Updates animation state and returns move factor
    var updateAnimation = function(deltaTime) {
      var i, easingName, timeFactor, moveFactor;

      if (currentAnimation === null) {
        if (animationQueue.length !== 0) {
          currentAnimation = animationQueue[0];
          animationQueue.splice(0, 1);

          switch (currentAnimation.type) {
            case 'showFigure':
              setFigure(currentAnimation.properties.url, function() {
                currentAnimation.ready = true;
              }.bind(this));
              break;

            case 'hideFigure':
              actualImage = null;
              for (i = 0; i < figurePoints.length; i++) {
                figurePoints[i].setOffset();
              }
              break;
          }

          if (typeof currentAnimation.easing === 'string') {
            easingName = currentAnimation.easing;

            currentAnimation.easing = options.animationEasings[easingName];
          }
        } else {
          return 1;
        }
      }

      if (!currentAnimation.ready) {
        return 1;
      }

      currentAnimation.clock += deltaTime;

      timeFactor = currentAnimation.clock / currentAnimation.duration;
      moveFactor = currentAnimation.easing(timeFactor);

      if (timeFactor >= 1) {
        removeOffscreenFigurePoints();

        if (typeof currentAnimation.callback === 'function') {
          currentAnimation.callback();
        }

        currentAnimation = null;
      }

      return moveFactor;
    }.bind(this);

    // Sets a new figure
    var setFigure = function(url, callback) {
      loadImage(url, function(image) {
        var imageData;

        imageData = getImageData(image);
        imageDataToFigure(imageData, callback);
      }.bind(this));
    }.bind(this);

    // Loads a new image
    var loadImage = function(url, callback) {
      var image;

      image = new Image();

      image.onload = function() {
        if (typeof callback === 'function') {
          callback(image);
        }
      }.bind(this);

      actualImage = image.src = url;
    }.bind(this);

    // Returns image data from an image
    var getImageData = function(image) {
      var imageSize, imagePropotion, imagePosition, imageData, vCanvas, context;

      imagePropotion = 1;

      imageSize = {
        width: image.width,
        height: image.height
      };

      imagePropotion = elW / imageSize.width;

      if (elH / imageSize.height < imagePropotion) {
        imagePropotion = elH / imageSize.height;
      }

      imageSize = {
        width: imagePropotion * imageSize.width,
        height: imagePropotion * imageSize.height
      };

      imagePosition = {
        x: elW / 2 - imageSize.width / 2,
        y: elH / 2 - imageSize.height / 2
      };

      vCtx.clearRect(0, 0, elW, elH);
      vCtx.drawImage(image, imagePosition.x, imagePosition.y, imageSize.width, imageSize.height);
      imageData = vCtx.getImageData(0, 0, elW, elH);

      return imageData.data;
    }.bind(this);


    // Converts image data to a points figure
    var imageDataToFigure = function(imageData, callback) {
      var i, numberPoints, x, y, position, point;

      i = 3;
      numberPoints = 0;
      for (y = 0; y < elH; y++) {
        for (x = 0; x < elW; x++, i += 4) {
          if (imageData[i] > 127 && Math.random() < options.pointDensity) {
            position = {
              x: x,
              y: y
            };

            if (typeof figurePoints[numberPoints] !== 'undefined') {
              figurePoints[numberPoints].setPosition(position);
            } else {
              point = new FigurePoint(position);
              figurePoints.push(point);
            }

            numberPoints++;
          }
        }
      }

      for (i = numberPoints; i < figurePoints.length; i++) {
        figurePoints[i].setOffset();
      }

      if (typeof callback === 'function') {
        callback();
      }
    }.bind(this);


    // Removes offscreen points of previous figure
    var removeOffscreenFigurePoints = function() {
      for (var i = 0; i < figurePoints.length; i++) {
        if (figurePoints[i].offscreen) {
          figurePoints.splice(i, 1);
          i--;
        }
      }
    }.bind(this);

    /**
     * FigurePoint
     **/

    /**
     * Constructor
     **/

    function FigurePoint(position) {
      var radiusDelta, opacityDelta, trembleDurationDelta;

      radiusDelta = options.maxParticleRadius - options.minParticleRadius;
      this.radius = Math.random() * radiusDelta + options.minParticleRadius;

      opacityDelta = options.maxParticleOpacity - options.minParticleOpacity;
      this.opacity = Math.random() * opacityDelta + options.minParticleOpacity;

      this.offscreen = false;

      switch (Math.floor(Math.random() * 4)) {
        case 0:
          this.offscreenPosition = {
            x: Math.random() * (elW + 200) - 100,
            y: Math.random() * -80 - 20
          };
          break;

        case 1:
          this.offscreenPosition = {
            x: elW + (Math.random() * 80 + 20),
            y: Math.random() * (elH + 200) - 100
          };
          break;

        case 2:
          this.offscreenPosition = {
            x: Math.random() * (elW + 200) - 100,
            y: elH + (Math.random() * 80 + 20)
          };
          break;

        case 3:
          this.offscreenPosition = {
            x: Math.random() * -80 - 20,
            y: Math.random() * (elH + 200) - 100
          };
          break;
      }

      this.position = {
        x: this.offscreenPosition.x,
        y: this.offscreenPosition.y
      };

      this.previousPosition = {
        x: this.offscreenPosition.x,
        y: this.offscreenPosition.y
      };

      this.nextPosition = {
        x: position.x,
        y: position.y
      };

      this.previousTrembleOffset = {
        x: 0,
        y: 0
      };

      this.nextTrembleOffset = {
        x: 0,
        y: 0
      };

      this.mouseOffset = {
        x: 0,
        y: 0
      };

      trembleDurationDelta = options.maxTrembleDuration - options.minTrembleDuration;
      this.trembleDuration = Math.random() * trembleDurationDelta + options.minTrembleDuration;
      this.trembleClock = options.maxTrembleDuration;
    }

    /**
     * Functions
     **/

    FigurePoint.prototype.setPosition = function(positon) {
      this.previousPosition = {
        x: this.nextPosition.x,
        y: this.nextPosition.y
      };

      this.nextPosition = {
        x: positon.x,
        y: positon.y
      };
    };

    FigurePoint.prototype.setOffset = function() {
      this.previousPosition = {
        x: this.nextPosition.x,
        y: this.nextPosition.y
      };

      this.nextPosition = {
        x: this.offscreenPosition.x,
        y: this.offscreenPosition.y
      };

      this.offscreen = true;
    };

    // Updates state
    FigurePoint.prototype.update = function(factor, deltaTime) {
      var
        deltaX,
        deltaY;

      // Updates main position
      if (factor < 1) {
        deltaX = this.nextPosition.x - this.previousPosition.x;
        deltaY = this.nextPosition.y - this.previousPosition.y;

        this.position = {
          x: this.previousPosition.x + (deltaX * factor),
          y: this.previousPosition.y + (deltaY * factor)
        };
      } else {
        this.position = {
          x: this.nextPosition.x,
          y: this.nextPosition.y
        };
      }

      // Updates tremble offset
      var
        timeFactor,
        trembleOffsetDelta,
        trembleOffset;

      if (this.trembleDuration <= this.trembleClock) {
        this.trembleClock = 0;

        this.previousTrembleOffset = {
          x: this.nextTrembleOffset.x,
          y: this.nextTrembleOffset.y
        };

        trembleOffsetDelta = options.maxTrembleOffset - options.minTrembleOffset;
        this.nextTrembleOffset = {
          x: Math.random() * trembleOffsetDelta - options.minTrembleOffset,
          y: Math.random() * 20 - 10
        };
      }

      deltaX = this.nextTrembleOffset.x - this.previousTrembleOffset.x;
      deltaY = this.nextTrembleOffset.y - this.previousTrembleOffset.y;

      this.trembleClock += deltaTime;

      timeFactor = this.trembleClock / this.trembleDuration;

      trembleOffset = {
        x: this.previousTrembleOffset.x + (deltaX * timeFactor),
        y: this.previousTrembleOffset.y + (deltaY * timeFactor)
      };

      this.position = {
        x: this.position.x + trembleOffset.x,
        y: this.position.y + trembleOffset.y
      };

      // Updates mouse offset
      if (!options.pointForceActivated) {
        return;
      }

      var
        forceRadius,
        distanceToMouse,
        hasMouseOffset,
        maxMouseOffset;

      deltaX = this.position.x - pointerPos.x;
      deltaY = this.position.y - pointerPos.y;

      distanceToMouse = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

      if (mouseDown && options.clickedMouseForceActivated) {
        forceRadius = options.clickedMouseForceRadius;
      } else {
        forceRadius = options.pointForceRadius;
      }

      hasMouseOffset = Math.abs(this.mouseOffset.x) > 0 ||
        Math.abs(this.mouseOffset.y) > 0;

      if (!isTouched && hasMouseOffset) {
        this.mouseOffset.x -= this.mouseOffset.x * 0.1;
        this.mouseOffset.y -= this.mouseOffset.y * 0.1;
      } else if (Math.abs(distanceToMouse) < forceRadius) {
        maxMouseOffset = {
          x: (deltaX / distanceToMouse * forceRadius) - deltaX,
          y: (deltaY / distanceToMouse * forceRadius) - deltaY
        };

        this.mouseOffset.x += (maxMouseOffset.x - this.mouseOffset.x) * 0.1;
        this.mouseOffset.y += (maxMouseOffset.y - this.mouseOffset.y) * 0.1;
      } else if (hasMouseOffset) {
        this.mouseOffset.x -= this.mouseOffset.x * 0.1;
        this.mouseOffset.y -= this.mouseOffset.y * 0.1;
      }

      this.position = {
        x: this.position.x + this.mouseOffset.x,
        y: this.position.y + this.mouseOffset.y
      };
    };

    // Calls constructor
    init();
  };

  return StrangeOrbits;
});

/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = typeof Float32Array === 'function';

function A(aA1, aA2) {
  return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}

function B(aA1, aA2) {
  return 3.0 * aA2 - 6.0 * aA1;
}

function C(aA1) {
  return 3.0 * aA1;
}

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier(aT, aA1, aA2) {
  return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope(aT, aA1, aA2) {
  return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

function binarySubdivide(aX, aA, aB, mX1, mX2) {
  var currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
  for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
    var currentSlope = getSlope(aGuessT, mX1, mX2);
    if (currentSlope === 0.0) {
      return aGuessT;
    }
    var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

window.BezierEasing = function bezier(mX1, mY1, mX2, mY2) {
  if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  // Precompute samples table
  var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
  if (mX1 !== mY1 || mX2 !== mY2) {
    for (var i = 0; i < kSplineTableSize; ++i) {
      sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
    }
  }

  function getTForX(aX) {
    var intervalStart = 0.0;
    var currentSample = 1;
    var lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    var guessForT = intervalStart + dist * kSampleStepSize;

    var initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
    }
  }

  return function BezierEasing(x) {
    if (mX1 === mY1 && mX2 === mY2) {
      return x; // linear
    }
    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
    if (x === 0) {
      return 0;
    }
    if (x === 1) {
      return 1;
    }
    return calcBezier(getTForX(x), mY1, mY2);
  };
};
