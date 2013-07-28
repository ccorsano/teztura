// Generated by CoffeeScript 1.6.3
var $mainCanvas, brush, changeGamma, drawing, gamma, getMainContext, getPenPressure, height, layer, offset, onDraw, refresh, width;

$mainCanvas = $('#canvas');

width = $mainCanvas.width();

height = $mainCanvas.height();

drawing = false;

gamma = 1.0;

layer = new Layer(width, height);

offset = new Vector(50, 30);

brush = new TestBrush1();

brush.stepSize = 1;

getMainContext = function() {
  return $mainCanvas[0].getContext('2d');
};

getPenPressure = function() {
  var penAPI, plugin;
  plugin = document.getElementById('wtPlugin');
  penAPI = plugin.penAPI;
  if (penAPI && penAPI.pointerType > 0) {
    return penAPI.pressure;
  }
  return 1.0;
};

onDraw = function(e) {
  var brushRects, brushX, brushY, pos, pressure, rect;
  brushX = e.pageX - $mainCanvas.position().left - offset.x;
  brushY = e.pageY - $mainCanvas.position().top - offset.y;
  pressure = getPenPressure();
  brushRects = [];
  pos = new Vector(brushX, brushY);
  rect = brush.draw(layer, pos, pressure);
  brushRects.push(rect.round());
  return setTimeout(function() {
    var _i, _len, _results;
    drawLayer(layer, brushRects, gamma);
    _results = [];
    for (_i = 0, _len = brushRects.length; _i < _len; _i++) {
      rect = brushRects[_i];
      _results.push(getMainContext().drawImage(layer.canvas, rect.x, rect.y, rect.width, rect.height, offset.x + rect.x, offset.y + rect.y, rect.width, rect.height));
    }
    return _results;
  }, 0);
};

changeGamma = function(value) {
  gamma = value;
  return refresh();
};

refresh = function() {
  drawLayer(layer, [new Rect(0, 0, width, height)], gamma);
  return getMainContext().drawImage(layer.canvas, offset.x, offset.y);
};

$mainCanvas.mouseup(function(e) {
  drawing = false;
  return brush.endStroke();
});

$mainCanvas.mousedown(function(e) {
  drawing = true;
  brush.beginStroke();
  return onDraw(e);
});

$mainCanvas.mousemove(function(e) {
  if (drawing) {
    return onDraw(e);
  }
});

$('#gammaSlider').slider({
  min: 0,
  max: 4,
  step: 0.01,
  value: gamma,
  change: function(evt, ui) {
    return changeGamma(ui.value);
  }
});

fillLayer(layer, function(x, y) {
  return -1;
});

refresh();
