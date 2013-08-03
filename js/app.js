// Generated by CoffeeScript 1.6.3
var Document, DocumentView, Editor, Tools, createToolsUI, getPenPressure, status;

Document = (function() {
  function Document(width, height) {
    this.width = width;
    this.height = height;
    this.layer = new Layer(this.width, this.height);
  }

  return Document;

})();

Editor = {
  brush: null,
  renderer: GammaRenderer,
  targetValue: 1.0
};

Tools = [RoundBrush, Picker];

Editor.tool = RoundBrush.createTool(Editor);

DocumentView = (function() {
  DocumentView.prototype.drawing = false;

  DocumentView.prototype.panning = false;

  DocumentView.prototype.imageData = null;

  DocumentView.prototype.context = null;

  DocumentView.prototype.canvas = null;

  DocumentView.prototype.backContext = null;

  DocumentView.prototype.doc = null;

  DocumentView.prototype.offset = new Vec2(0.0, 0.0);

  DocumentView.prototype.scale = 1;

  function DocumentView($container, doc) {
    var $backCanvas, $canvas, getCanvasCoords, getCoords, local, self;
    this.doc = doc;
    $container.empty();
    $canvas = $('<canvas/>', {
      'class': ''
    }).attr({
      width: doc.width,
      height: doc.height
    });
    $backCanvas = $('<canvas/>', {
      'class': ''
    }).attr({
      width: doc.width,
      height: doc.height
    });
    $container.append($backCanvas);
    this.backContext = $backCanvas[0].getContext('2d');
    this.canvas = $canvas[0];
    this.context = $canvas[0].getContext('2d');
    this.imageData = this.context.getImageData(0, 0, doc.width, doc.height);
    this.context.mozImageSmoothingEnabled = false;
    self = this;
    getCoords = function(e) {
      var x, y;
      x = e.pageX - $backCanvas.position().left;
      y = e.pageY - $backCanvas.position().top;
      return new Vec2(x, y);
    };
    getCanvasCoords = function(e) {
      var v;
      v = getCoords(e);
      return self.screenToCanvas(v);
    };
    local = {};
    $container.mousedown(function(e) {
      e.preventDefault();
      if (e.which === 1) {
        self.drawing = true;
        Editor.tool.beginDraw();
        self.onDraw(getCanvasCoords(e));
      }
      if (e.which === 2) {
        self.panning = true;
        local.panningStart = getCoords(e);
        return local.offsetStart = self.offset;
      }
    });
    $container.mouseup(function(e) {
      if (e.which === 1) {
        Editor.tool.endDraw();
        self.drawing = false;
      }
      if (e.which === 2) {
        return self.panning = false;
      }
    });
    $container.mousemove(function(e) {
      var curPos;
      if (self.drawing) {
        self.onDraw(getCanvasCoords(e));
      }
      if (self.panning) {
        curPos = getCoords(e);
        self.offset = local.offsetStart.add(curPos.sub(local.panningStart));
        return self.transformChanged();
      }
    });
  }

  DocumentView.prototype.screenToCanvas = function(pt) {
    return pt.sub(this.offset).scale(1.0 / this.scale);
  };

  DocumentView.prototype.refreshAll = function() {
    var layer;
    layer = this.doc.layer;
    Editor.renderer.renderLayer(layer, this, [new Rect(0, 0, this.doc.width, this.doc.height)]);
    return this.backContext.drawImage(this.canvas, 0, 0);
  };

  DocumentView.prototype.transformChanged = function() {
    this.backContext.setTransform(1, 0, 0, 1, 0, 0);
    this.backContext.translate(this.offset.x, this.offset.y);
    this.backContext.scale(this.scale, this.scale);
    return this.backContext.drawImage(this.canvas, 0, 0);
  };

  DocumentView.prototype.onDraw = function(pos) {
    var brush, dirtyRects, layer, layerRect, pressure, r, rect, self, tiling, xoff, yoff, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results;
    self = this;
    pressure = getPenPressure();
    dirtyRects = [];
    tiling = true;
    layer = this.doc.layer;
    brush = Editor.tool;
    layerRect = layer.getRect();
    r = brush.draw(layer, pos, pressure).round();
    if (tiling) {
      _ref = [-1, 0, 1];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        xoff = _ref[_i];
        _ref1 = [-1, 0, 1];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          yoff = _ref1[_j];
          dirtyRects.push(r.offset(new Vec2(xoff * layerRect.width, yoff * layerRect.height)));
        }
      }
    } else {
      dirtyRects.push(r);
    }
    dirtyRects = dirtyRects.map(function(r) {
      return r.intersect(layerRect);
    }).filter(function(r) {
      return !r.isEmpty();
    });
    status(dirtyRects.length);
    if (true) {
      Editor.renderer.renderLayer(layer, self, dirtyRects);
      _results = [];
      for (_k = 0, _len2 = dirtyRects.length; _k < _len2; _k++) {
        rect = dirtyRects[_k];
        _results.push(self.backContext.drawImage(self.canvas, rect.x, rect.y, rect.width + 1, rect.height + 1, rect.x, rect.y, rect.width + 1, rect.height + 1));
      }
      return _results;
    }
  };

  return DocumentView;

})();

getPenPressure = function() {
  var penAPI, plugin;
  plugin = document.getElementById('wtPlugin');
  penAPI = plugin.penAPI;
  if (penAPI && penAPI.pointerType > 0) {
    return penAPI.pressure;
  }
  return 1.0;
};

status = function(txt) {
  return $('#status-bar').text(txt);
};

createToolsUI = function($container) {
  $container.empty();
  return Tools.forEach(function(b) {
    var $btn, name;
    name = b.description.name;
    $btn = $('<button/>').attr({
      'class': 'btn'
    }).text(name);
    $btn.click(function(e) {
      Editor.tool = b.createTool(Editor);
      return status("Active brush set to " + name);
    });
    return $container.append($btn);
  });
};

$(document).ready(function() {
  var doc, view;
  doc = new Document(512, 512);
  fillLayer(doc.layer, function(x, y) {
    x += 1.0;
    y += 1.0;
    return (Math.round(x * 40) % 2) * 0.1 - (Math.round(y * 40) % 2) * 0.1;
  });
  createToolsUI($('#tools'));
  view = new DocumentView($('.document-view'), doc);
  view.transformChanged();
  return view.refreshAll();
});
