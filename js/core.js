// Generated by CoffeeScript 1.6.3
var Bezier, Brush, FloatBuffer, Layer, Rect, TestBrush1, Vector;

Vector = (function() {
  function Vector(x, y) {
    this.x = x;
    this.y = y;
  }

  Vector.prototype.distanceTo = function(v) {
    return Math.sqrt(squareDistanceTo(v));
  };

  Vector.prototype.squareDistanceTo = function(v) {
    var dx, dy;
    dx = this.x - v.x;
    dy = this.y - v.y;
    return dx * dx + dy * dy;
  };

  Vector.prototype.add = function(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  };

  Vector.prototype.sub = function(v) {
    return new Vector(this.x - v.x, this.y - v.y);
  };

  Vector.prototype.scale = function(s) {
    return new Vector(this.x * s, this.y * s);
  };

  Vector.prototype.length = function() {
    return Math.sqrt(this.squareLength());
  };

  Vector.prototype.squareLength = function() {
    return this.x * this.x + this.y * this.y;
  };

  Vector.prototype.normalized = function() {
    return this.scale(1.0 / this.length());
  };

  return Vector;

})();

Rect = (function() {
  function Rect(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  Rect.prototype.intersect = function(rect) {
    var nmaxx, nmaxy, nx, ny;
    nmaxx = Math.min(this.x + this.width, rect.x + rect.width);
    nmaxy = Math.min(this.x + this.width, rect.x + rect.width);
    nx = Math.max(this.x, rect.x);
    ny = Math.max(this.y, rect.y);
    return new Rect(nx, ny, Math.max(0, nmaxx - nx), Math.max(0, nmaxy - ny));
  };

  Rect.prototype.union = function(rect) {
    var ret;
    ret = new Rect(this.x, this.y, this.width, this.height);
    ret.extend(rect.topLeft());
    ret.extend(rect.bottomRight());
    return ret;
  };

  Rect.prototype.round = function() {
    return new Rect(Math.floor(this.x), Math.floor(this.y), Math.ceil(this.width), Math.ceil(this.height));
  };

  Rect.prototype.extend = function(pt) {
    if (pt.x < this.x) {
      this.width += this.x - pt.x;
      this.x = pt.x;
    } else {
      this.width = Math.max(this.width, pt.x - this.x);
    }
    if (pt.y < this.y) {
      this.height += this.y - pt.y;
      return this.y = pt.y;
    } else {
      return this.height = Math.max(this.height, pt.y - this.y);
    }
  };

  Rect.prototype.topLeft = function() {
    return new Vector(this.x, this.y);
  };

  Rect.prototype.bottomRight = function() {
    return new Vector(this.x + this.width, this.y + this.height);
  };

  return Rect;

})();

FloatBuffer = (function() {
  function FloatBuffer(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new ArrayBuffer(this.width * this.height * 4);
    this.fbuffer = new Float32Array(this.buffer);
  }

  return FloatBuffer;

})();

Layer = (function() {
  function Layer(width, height) {
    this.width = width;
    this.height = height;
    this.data = new FloatBuffer(this.width, this.height);
    this.canvas = this.createCanvas(this.width, this.height);
    this.context = this.canvas.getContext('2d');
    this.imageData = this.context.getImageData(0, 0, width, height);
  }

  Layer.prototype.getBuffer = function() {
    return this.data.fbuffer;
  };

  Layer.prototype.createCanvas = function(width, height) {
    var c;
    c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  };

  return Layer;

})();

Bezier = {
  quadratic: function(pts, t) {
    var f2, f3, lerp;
    lerp = function(a, b, t) {
      return a * t + b * (1 - t);
    };
    f3 = function(v1, v2, v3, t) {
      return lerp(lerp(v1, v2, t), lerp(v2, v3, t), t);
    };
    f2 = function(v1, v2, t) {
      return lerp(v1, v2, t);
    };
    if (pts.length === 1) {
      return pts[0];
    } else if (pts.length === 2) {
      return new Vector(f2(pts[0].x, pts[1].x, t), f2(pts[0].y, pts[1].y, t));
    } else {
      return new Vector(f3(pts[0].x, pts[1].x, pts[2].x, t), f3(pts[0].y, pts[1].y, pts[2].y, t));
    }
  }
};

Brush = (function() {
  function Brush() {}

  Brush.prototype.stroke = function(layer, start, end, pressure) {};

  Brush.prototype.move = function(pos, intensity) {};

  Brush.prototype.beginStroke = function(pos) {};

  Brush.prototype.endStroke = function(pos) {};

  return Brush;

})();

TestBrush1 = (function() {
  function TestBrush1() {}

  TestBrush1.prototype.drawing = false;

  TestBrush1.prototype.lastpos = null;

  TestBrush1.prototype.accumulator = 0.0;

  TestBrush1.prototype.stepSize = 4.0;

  TestBrush1.prototype.move = function(pos, intensity) {};

  TestBrush1.prototype.draw = function(layer, pos, intensity) {
    var delt, dir, fb, length, pt, rect;
    fb = layer.getBuffer();
    rect = new Rect(pos.x, pos.y, 1, 1);
    if (this.lastpos != null) {
      delt = pos.sub(this.lastpos);
      length = delt.length();
      dir = delt.scale(1.0 / length);
      while (this.accumulator + this.stepSize <= length) {
        this.accumulator += this.stepSize;
        pt = this.lastpos.add(dir.scale(this.accumulator));
        fb[Math.floor(pt.x) + Math.floor(pt.y) * layer.width] = 1.0;
        rect.extend(pt);
      }
      this.accumulator -= length;
    } else {
      fb[Math.floor(pos.x) + Math.floor(pos.y) * layer.width] = 1.0;
    }
    this.lastpos = pos;
    return rect;
  };

  TestBrush1.prototype.beginStroke = function() {
    this.drawing = true;
    return this.accumulator = 0;
  };

  TestBrush1.prototype.endStroke = function() {
    this.lastpos = null;
    return this.drawing = false;
  };

  return TestBrush1;

})();


function drawLayer (layer, rects, gamma) {
  var width = layer.width;
  var height = layer.height;
  var imgData = layer.imageData.data;
  var fb = layer.getBuffer();
  for(var i in rects) {
    var r = rects[i];
    var minX = r.x;
    var minY = r.y;
    var maxX = minX + r.width;
    var maxY = minY + r.height;
    for(var iy=minY; iy<maxY; ++iy) {
      var offset = iy * width;
      for(var ix=minX; ix<maxX; ++ix) {
        var fval = fb[offset + ix];
        var val = Math.pow((fval + 1.0) * 0.5, gamma) * 255.0;
        var i = (offset + ix) << 2;
        imgData[i] = val;
        imgData[++i] = val;
        imgData[++i] = val;
        imgData[++i] = 0xff;
      }
    }
    layer.context.putImageData(layer.imageData, 0, 0, r.x, r.y, r.width, r.height);
  }
}

function fillLayer(layer, func) {
  var width = layer.width;
  var height = layer.height;
  var invw = 1.0 / width;
  var invh = 1.0 / height;
  var fb = layer.getBuffer();
  for(var iy=0; iy<height; ++iy) {
    var off = iy * width;
    for(var ix=0; ix<width; ++ix) {
      fb[off + ix] = func(ix * invw, iy * invh);
    }
  }
}
;

if (typeof module !== "undefined" && module !== null) {
  module.exports = {
    Vector: Vector,
    Rect: Rect,
    FloatBuffer: FloatBuffer,
    Layer: Layer
  };
}