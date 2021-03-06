var Bezier, FloatBuffer, Layer, Rect, Vec2, Vec3, genBlendFunc, genBrushFunc, getRoundBrushFunc;

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
  }

  Layer.prototype.getRect = function() {
    return new Rect(0, 0, this.width, this.height);
  };

  Layer.prototype.getBuffer = function() {
    return this.data.fbuffer;
  };

  Layer.prototype.getAt = function(pos) {
    var ipos;
    ipos = pos.wrap(this.width, this.height).round();
    return this.data.fbuffer[ipos.y * this.width + ipos.x];
  };

  Layer.prototype.getNormalAt = function(pos, rad) {
    var fb, norm, p, px, py, sx1, sx2, sy1, sy2, xvec, yvec;
    p = pos.round();
    fb = this.data.fbuffer;
    px = Math.round(pos.x);
    py = Math.round(pos.y);
    sx1 = fb[py * this.width + ((px - rad) % this.width)];
    sx2 = fb[py * this.width + ((px + rad) % this.width)];
    sy1 = fb[((py - rad) % this.height) * this.width + px];
    sy2 = fb[((py + rad) % this.height) * this.width + px];
    xvec = new Vec3(rad * 2, 0, sx2 - sx1);
    yvec = new Vec3(0, rad * 2, sy2 - sy1);
    norm = xvec.cross(yvec).normalized();
    return norm;
  };

  Layer.prototype.getCopy = function(rect) {
    var dstData, srcData;
    srcData = this.data.buffer;
    dstData = new ArrayBuffer(rect.width * rect.height * 4);
    
    for(var iy=0; iy<rect.height; ++iy) {
      var src = new Uint32Array(srcData, 4 * ((iy + rect.y) * this.width + rect.x), rect.width);
      var dst = new Uint32Array(dstData, 4 * iy * rect.width, rect.width);
      dst.set(src);
    };
    return dstData;
  };

  Layer.prototype.setData = function(buffer, rect) {
    var dstData;
    dstData = this.data.buffer;
    
    for(var iy=0; iy<rect.height; ++iy) {
      var src = new Uint32Array(buffer, 4 * iy * rect.width, rect.width);
      var dstOff = 4 * ((iy + rect.y) * this.width + rect.x);
      var dst = new Uint32Array(dstData, dstOff, rect.width);
      dst.set(src);
    };
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
      return new Vec2(f2(pts[0].x, pts[1].x, t), f2(pts[0].y, pts[1].y, t));
    } else {
      return new Vec2(f3(pts[0].x, pts[1].x, pts[2].x, t), f3(pts[0].y, pts[1].y, pts[2].y, t));
    }
  }
};


function fillLayer(layer, func) {
  var width = layer.width;
  var height = layer.height;
  var invw = 2.0 / (width - 1);
  var invh = 2.0 / (height - 1);
  var fb = layer.getBuffer();
  for(var iy=0; iy<height; ++iy) {
    var off = iy * width;
    for(var ix=0; ix<width; ++ix) {
      fb[off] = func(ix * invw - 1.0, iy * invh - 1.0);
      ++off;
    }
  }
}
;

genBlendFunc = function(args, expression) {
  var expr, str;
  expr = expression.replace(/{dst}/g, "dstData[dsti]").replace(/{src}/g, "srcData[srci]");
  str = "    (function (pos, srcFb, dstFb, " + args + ") {      var minx = Math.max(0, -pos.x);      var miny = Math.max(0, -pos.y);      var sw = Math.min(srcFb.width, dstFb.width - pos.x);      var sh = Math.min(srcFb.height, dstFb.height - pos.y);      var srcData = srcFb.getBuffer();      var dstData = dstFb.getBuffer();      for(var sy=miny; sy<sh; ++sy) {        var srci = sy * srcFb.width + minx;        var dsti = (pos.y + sy) * dstFb.width + pos.x + minx;        for(var sx=minx; sx<sw; ++sx) {          " + expr + ";          ++dsti;          ++srci;        }      }    })";
  return eval(str);
};

genBrushFunc = function(opts) {
  var blendExp, brushExp, str;
  blendExp = opts.blendExp.replace(/{dst}/g, "dstData[dsti]").replace(/{src}/g, "_tmp");
  brushExp = opts.brushExp.replace(/{out}/g, "_tmp");
  str = "(function (rect, layer, " + opts.args + ") {    var invw = 2.0 / (rect.width - 1);    var invh = 2.0 / (rect.height - 1);    var offx = -(rect.x % 1.0) * invw - 1.0;    var offy = -(rect.y % 1.0) * invh - 1.0;    var fbw = layer.width;    var fbh = layer.height;    var dstData = layer.getBuffer();";
  str += opts.tiling ? "      var minx = Math.floor(rect.x) + fbw;      var miny = Math.floor(rect.y) + fbh;      var sw = Math.round(rect.width);      var sh = Math.round(rect.height);            for(var sy=0; sy<sh; ++sy) {        var y = sy * invh + offy;        for(var sx=0; sx<sw; ++sx) {          var x = sx * invw + offx;          var dsti = ((sy + miny) % fbh) * fbw + ((sx + minx) % fbw);          var _tmp = 0.0;          " + brushExp + ";          " + blendExp + ";        }      }" : "      var minx = Math.floor(Math.max(0, -rect.x));      var miny = Math.floor(Math.max(0, -rect.y));      var sw = Math.round(Math.min(rect.width, fbw - rect.x));      var sh = Math.round(Math.min(rect.height, fbh - rect.y));      for(var sy=miny; sy<sh; ++sy) {        var dsti = (Math.floor(rect.y) + sy) * layer.width + Math.floor(rect.x) + minx;        var y = sy * invh + offy;        for(var sx=minx; sx<sw; ++sx) {          var x = sx * invw + offx;          var _tmp = 0.0;          " + brushExp + ";          " + blendExp + ";          ++dsti;        }      }";
  str += "});";
  return eval(str);
};

getRoundBrushFunc = function(hardness) {
  var hardnessPlus1;
  hardnessPlus1 = hardness + 1.0;
  return function(x, y) {
    var d;
    d = Math.min(1.0, Math.max(0.0, Math.sqrt(x * x + y * y) * hardnessPlus1 - hardness));
    return Math.cos(d * Math.PI) * 0.5 + 0.5;
  };
};

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
    nmaxy = Math.min(this.y + this.height, rect.y + rect.height);
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

  Rect.prototype.clone = function() {
    return new Rect(this.x, this.y, this.width, this.height);
  };

  Rect.prototype.offset = function(vec) {
    return new Rect(this.x + vec.x, this.y + vec.y, this.width, this.height);
  };

  Rect.prototype.isEmpty = function() {
    return this.width <= 0 || this.height <= 0;
  };

  Rect.prototype.round = function() {
    return new Rect(Math.floor(this.x), Math.floor(this.y), Math.ceil(this.width), Math.ceil(this.height));
  };

  Rect.prototype.extend = function(obj) {
    if (obj.width != null) {
      this.extend(obj.topLeft());
      return this.extend(obj.bottomRight());
    } else {
      if (obj.x < this.x) {
        this.width += this.x - obj.x;
        this.x = obj.x;
      } else {
        this.width = Math.max(this.width, obj.x - this.x);
      }
      if (obj.y < this.y) {
        this.height += this.y - obj.y;
        return this.y = obj.y;
      } else {
        return this.height = Math.max(this.height, obj.y - this.y);
      }
    }
  };

  Rect.prototype.topLeft = function() {
    return new Vec2(this.x, this.y);
  };

  Rect.prototype.bottomRight = function() {
    return new Vec2(this.x + this.width, this.y + this.height);
  };

  return Rect;

})();

Rect.Empty = new Rect(0, 0, 0, 0);

Vec2 = (function() {
  function Vec2(x, y) {
    this.x = x;
    this.y = y;
  }

  Vec2.prototype.clone = function() {
    return new Vec2(this.x, this.y);
  };

  Vec2.prototype.distanceTo = function(v) {
    return Math.sqrt(squareDistanceTo(v));
  };

  Vec2.prototype.squareDistanceTo = function(v) {
    var dx, dy;
    dx = this.x - v.x;
    dy = this.y - v.y;
    return dx * dx + dy * dy;
  };

  Vec2.prototype.round = function() {
    return new Vec2(Math.round(this.x), Math.round(this.y));
  };

  Vec2.prototype.add = function(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  };

  Vec2.prototype.sub = function(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  };

  Vec2.prototype.scale = function(s) {
    return new Vec2(this.x * s, this.y * s);
  };

  Vec2.prototype.length = function() {
    return Math.sqrt(this.squareLength());
  };

  Vec2.prototype.squareLength = function() {
    return this.x * this.x + this.y * this.y;
  };

  Vec2.prototype.normalized = function() {
    return this.scale(1.0 / this.length());
  };

  Vec2.prototype.wrap = function(w, h) {
    return new Vec2((this.x % w + w) % w, (this.y % h + h) % h);
  };

  Vec2.prototype.toString = function() {
    return this.x + ", " + this.y;
  };

  return Vec2;

})();

Vec3 = (function() {
  function Vec3(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  Vec3.prototype.add = function(v) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  };

  Vec3.prototype.sub = function(v) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  };

  Vec3.prototype.scale = function(s) {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  };

  Vec3.prototype.length = function() {
    return Math.sqrt(this.squareLength());
  };

  Vec3.prototype.squareLength = function() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  };

  Vec3.prototype.normalized = function() {
    return this.scale(1.0 / this.length());
  };

  Vec3.prototype.cross = function(v) {
    return new Vec3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
  };

  Vec3.prototype.dot = function(v) {
    return this.x + v.x + this.y + v.y + this.z + v.z;
  };

  Vec3.prototype.toString = function() {
    return this.x + ", " + this.y + ", " + this.z;
  };

  return Vec3;

})();

/*
//@ sourceMappingURL=teztura-core.js.map
*/