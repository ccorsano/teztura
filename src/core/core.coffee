
class FloatBuffer
  constructor: (@width, @height) ->
    @buffer = new ArrayBuffer @width * @height * 4
    @fbuffer = new Float32Array @buffer


class Layer
  constructor: (@width, @height) ->
    @data = new FloatBuffer(@width, @height)

  getRect: ->
    return new Rect(0,0,@width,@height)

  getBuffer: ->
    return @data.fbuffer

  getAt: (pos)->
    ipos = pos.wrap(@width, @height).round()
    return @data.fbuffer[ ipos.y * @width + ipos.x ]

  getNormalAt: (pos, rad)->
    p = pos.round()
    fb = @data.fbuffer
    px = Math.round(pos.x)
    py = Math.round(pos.y)
    sx1 = fb[ py * @width + ((px-rad)%@width) ]
    sx2 = fb[ py * @width + ((px+rad)%@width) ]
    sy1 = fb[ ((py-rad) % @height) * @width + px ]
    sy2 = fb[ ((py+rad) % @height) * @width + px ]
    xvec = new Vec3(rad*2, 0, sx2 - sx1)
    yvec = new Vec3(0, rad*2, sy2 - sy1)
    norm = xvec.cross(yvec).normalized()
    return norm

  getCopy: (rect)->
    srcData = @data.buffer
    dstData = new ArrayBuffer(rect.width * rect.height * 4)
    `
    for(var iy=0; iy<rect.height; ++iy) {
      var src = new Uint32Array(srcData, 4 * ((iy + rect.y) * this.width + rect.x), rect.width);
      var dst = new Uint32Array(dstData, 4 * iy * rect.width, rect.width);
      dst.set(src);
    }`
    return dstData

  setData: (buffer, rect)->
    dstData = @data.buffer
    `
    for(var iy=0; iy<rect.height; ++iy) {
      var src = new Uint32Array(buffer, 4 * iy * rect.width, rect.width);
      var dstOff = 4 * ((iy + rect.y) * this.width + rect.x);
      var dst = new Uint32Array(dstData, dstOff, rect.width);
      dst.set(src);
    }`
    return

Bezier =
  quadratic: (pts, t)->
    lerp = (a, b, t) ->
      return (a * t + b * (1-t))
    f3 = (v1, v2, v3, t) ->
      return lerp(lerp(v1, v2, t), lerp(v2, v3, t), t)
    f2 = (v1, v2, t) ->
      return lerp(v1, v2, t)

    if pts.length is 1
      return pts[0]
    else if pts.length is 2
      return new Vec2 f2(pts[0].x, pts[1].x, t), f2(pts[0].y, pts[1].y, t)
    else
      return new Vec2 f3(pts[0].x, pts[1].x, pts[2].x, t), f3(pts[0].y, pts[1].y, pts[2].y, t)


`
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
`

genBlendFunc = (args, expression)->
  expr = expression
    .replace(/{dst}/g, "dstData[dsti]")
    .replace(/{src}/g, "srcData[srci]")

  str = "
    (function (pos, srcFb, dstFb, #{args}) {
      var minx = Math.max(0, -pos.x);
      var miny = Math.max(0, -pos.y);
      var sw = Math.min(srcFb.width, dstFb.width - pos.x);
      var sh = Math.min(srcFb.height, dstFb.height - pos.y);
      var srcData = srcFb.getBuffer();
      var dstData = dstFb.getBuffer();
      for(var sy=miny; sy<sh; ++sy) {
        var srci = sy * srcFb.width + minx;
        var dsti = (pos.y + sy) * dstFb.width + pos.x + minx;
        for(var sx=minx; sx<sw; ++sx) {
          #{expr};
          ++dsti;
          ++srci;
        }
      }
    })"
  return eval(str)

genBrushFunc = (opts)->
  blendExp = opts.blendExp
    .replace(/{dst}/g, "dstData[dsti]")
    .replace(/{src}/g, "_tmp")

  brushExp = opts.brushExp
    .replace(/{out}/g, "_tmp")

  str = "(function (rect, layer, #{opts.args}) {
    var invw = 2.0 / (rect.width - 1);
    var invh = 2.0 / (rect.height - 1);
    var offx = -(rect.x % 1.0) * invw - 1.0;
    var offy = -(rect.y % 1.0) * invh - 1.0;
    var fbw = layer.width;
    var fbh = layer.height;
    var dstData = layer.getBuffer();"
      
  str += if opts.tiling then "
      var minx = Math.floor(rect.x) + fbw;
      var miny = Math.floor(rect.y) + fbh;
      var sw = Math.round(rect.width);
      var sh = Math.round(rect.height);
      
      for(var sy=0; sy<sh; ++sy) {
        var y = sy * invh + offy;
        for(var sx=0; sx<sw; ++sx) {
          var x = sx * invw + offx;
          var dsti = ((sy + miny) % fbh) * fbw + ((sx + minx) % fbw);
          var _tmp = 0.0;
          #{brushExp};
          #{blendExp};
        }
      }"
  else "
      var minx = Math.floor(Math.max(0, -rect.x));
      var miny = Math.floor(Math.max(0, -rect.y));
      var sw = Math.round(Math.min(rect.width, fbw - rect.x));
      var sh = Math.round(Math.min(rect.height, fbh - rect.y));
      for(var sy=miny; sy<sh; ++sy) {
        var dsti = (Math.floor(rect.y) + sy) * layer.width + Math.floor(rect.x) + minx;
        var y = sy * invh + offy;
        for(var sx=minx; sx<sw; ++sx) {
          var x = sx * invw + offx;
          var _tmp = 0.0;
          #{brushExp};
          #{blendExp};
          ++dsti;
        }
      }"
  str += "});"

  return eval(str)

getRoundBrushFunc = (hardness) ->
  hardnessPlus1 = hardness + 1.0
  return (x,y) -> 
    d = Math.min(1.0, Math.max(0.0, (Math.sqrt(x*x + y*y) * hardnessPlus1 - hardness)))
    return Math.cos(d * Math.PI) * 0.5 + 0.5
