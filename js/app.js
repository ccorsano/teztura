// Generated by CoffeeScript 1.6.3
var Commands, Document, DocumentView, Editor, PropertyPanel, PropertyView, Renderers, Tools, createCommandsButtons, createPalette, createRenderersButtons, createToolsButtons, editor, getPenPressure, loadGradient, refresh, status, toolsProperties, view;

Document = (function() {
  function Document(width, height) {
    this.width = width;
    this.height = height;
    this.layer = new Layer(this.width, this.height);
  }

  return Document;

})();

Editor = Backbone.Model.extend({
  toolObject: null,
  getToolObject: function() {
    var o;
    if (this.get('toolObject') === null) {
      console.log("Creating brush of type " + this.get("tool").description.name);
      o = this.get('tool').createTool(this);
      this.set('toolObject', o);
    }
    return this.get('toolObject');
  },
  setToolDirty: function() {
    return this.set('toolObject', null);
  }
});

editor = new Editor({
  doc: null,
  tool: null,
  renderer: null,
  tiling: true,
  targetValue: 1.0
});

Renderers = [GammaRenderer, NormalRenderer, GradientRenderer];

Tools = [RoundBrush, Picker];

Commands = [
  {
    name: "Fill",
    func: function(doc) {
      var val;
      val = editor.get('targetValue');
      fillLayer(doc.layer, function(x, y) {
        return val;
      });
      return refresh();
    }
  }
];

DocumentView = (function() {
  DocumentView.prototype.drawing = false;

  DocumentView.prototype.panning = false;

  DocumentView.prototype.imageData = null;

  DocumentView.prototype.context = null;

  DocumentView.prototype.canvas = null;

  DocumentView.prototype.backContext = null;

  DocumentView.prototype.doc = null;

  DocumentView.prototype.offset = new Vec2(0.0, 0.0);

  DocumentView.prototype.scale = 1.0;

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
      var coords;
      e.preventDefault();
      if (e.which === 1) {
        self.drawing = true;
        coords = getCanvasCoords(e);
        editor.getToolObject().beginDraw(coords);
        self.onDraw(coords);
      }
      if (e.which === 2) {
        self.panning = true;
        local.panningStart = getCoords(e);
        return local.offsetStart = self.offset.clone();
      }
    });
    $container.mouseup(function(e) {
      e.preventDefault();
      if (e.which === 1) {
        editor.getToolObject().endDraw(getCanvasCoords(e));
        self.drawing = false;
      }
      if (e.which === 2) {
        return self.panning = false;
      }
    });
    $container.mousemove(function(e) {
      var curPos, limH, limW, o;
      e.preventDefault();
      if (self.drawing) {
        self.onDraw(getCanvasCoords(e));
      }
      if (self.panning) {
        curPos = getCoords(e);
        o = local.offsetStart.add(curPos.sub(local.panningStart));
        limW = self.doc.width / 3.0;
        limH = self.doc.height / 3.0;
        self.offset.x = Math.min(Math.max(o.x, -limW), limW);
        self.offset.y = Math.min(Math.max(o.y, -limH), limH);
        return self.rePaint();
      }
    });
  }

  DocumentView.prototype.screenToCanvas = function(pt) {
    return pt.sub(this.offset).scale(1.0 / this.scale);
  };

  DocumentView.prototype.reRender = function() {
    var layer;
    layer = this.doc.layer;
    editor.get('renderer').renderLayer(layer, this, [new Rect(0, 0, this.doc.width, this.doc.height)]);
    return this.rePaint();
  };

  DocumentView.prototype.rePaint = function() {
    var ctx;
    ctx = this.backContext;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(this.offset.x, this.offset.y);
    ctx.scale(this.scale, this.scale);
    if (editor.get('tiling')) {
      ctx.fillStyle = ctx.createPattern(this.canvas, "repeat");
      return ctx.fillRect(-this.offset.x / this.scale, -this.offset.y / this.scale, this.canvas.width / this.scale, this.canvas.height / this.scale);
    } else {
      return ctx.drawImage(this.canvas, 0, 0);
    }
  };

  DocumentView.prototype.onDraw = function(pos) {
    var dirtyRects, layer, layerRect, pressure, r, self, tool, xoff, yoff, _i, _j, _len, _len1, _ref, _ref1;
    self = this;
    pressure = getPenPressure();
    dirtyRects = [];
    layer = this.doc.layer;
    tool = editor.getToolObject();
    layerRect = layer.getRect();
    r = tool.draw(layer, pos, pressure).round();
    if (editor.get('tiling')) {
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
    if (true) {
      editor.get('renderer').renderLayer(layer, self, dirtyRects);
      return self.rePaint();
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

view = null;

refresh = function() {
  view.reRender();
  return view.rePaint();
};

PropertyView = Backbone.View.extend({
  className: "property",
  initialize: function() {
    var $slider, $val, prop, step, tool;
    tool = this.model.tool;
    prop = this.model.prop;
    $('<span/>').text(prop.name).appendTo(this.$el);
    if (prop.range != null) {
      step = prop.type === 'int' ? 1 : (prop.range[1] - prop.range[0]) / 100;
      $slider = $('<div/>').slider({
        min: prop.range[0],
        max: prop.range[1],
        value: tool.get(prop.id),
        step: step,
        change: function(evt, ui) {
          tool.set(prop.id, ui.value);
          return editor.setToolDirty();
        }
      }).width(200).appendTo(this.$el);
      $val = $('<input/>').val(tool.get(prop.id)).appendTo(this.$el).change(function(evt) {
        if (prop.type === 'int') {
          return tool.set(prop.id, parseInt($val.val()));
        } else {
          return tool.set(prop.id, parseFloat($val.val()));
        }
      });
      return this.listenTo(this.model.tool, "change:" + prop.id, function() {
        var v;
        v = tool.get(prop.id);
        $val.val(v);
        return $slider.slider("value", v);
      });
    }
  }
});

PropertyPanel = (function() {
  PropertyPanel.prototype.views = [];

  function PropertyPanel(selector) {
    this.selector = selector;
  }

  PropertyPanel.prototype.setTool = function(tool) {
    var self;
    self = this;
    this.removeViews();
    return tool.properties.forEach(function(prop) {
      var v;
      v = new PropertyView({
        model: {
          prop: prop,
          tool: tool
        }
      });
      $(self.selector).append(v.$el);
      return self.views.push(v);
    });
  };

  PropertyPanel.prototype.removeViews = function() {
    this.views.forEach(function(v) {
      return v.remove();
    });
    return this.views = [];
  };

  return PropertyPanel;

})();

toolsProperties = new PropertyPanel('#tools > .properties');

editor.on('change:tool', function() {
  var tool;
  editor.setToolDirty();
  tool = editor.get('tool');
  return toolsProperties.setTool(tool);
});

editor.on('change:renderer', function() {
  view.reRender();
  return view.rePaint();
});

createToolsButtons = function($container) {
  $container.empty();
  return Tools.forEach(function(b) {
    var $btn, name;
    name = b.description.name;
    $btn = $('<button/>').attr({
      'class': 'btn'
    }).text(name);
    $btn.click(function(e) {
      return editor.set('tool', b);
    });
    return $container.append($btn);
  });
};

createRenderersButtons = function($container) {
  $container.empty();
  return Renderers.forEach(function(r) {
    var $btn, name;
    name = r.description.name;
    $btn = $('<button/>').attr({
      'class': 'btn'
    }).text(name);
    $btn.click(function(e) {
      return editor.set('renderer', r);
    });
    return $container.append($btn);
  });
};

createCommandsButtons = function($container) {
  return Commands.forEach(function(cmd) {
    var $btn;
    $btn = $('<button/>').attr({
      'class': 'btn'
    }).text(cmd.name).appendTo($container);
    return $btn.click(function(e) {
      return cmd.func(editor.get('doc'));
    });
  });
};

createPalette = function($container) {
  var $slider;
  $slider = $('<div/>').slider({
    min: -1.0,
    max: 1.0,
    value: 0,
    step: 0.005,
    change: function(evt, ui) {
      return editor.set('targetValue', ui.value);
    }
  }).appendTo($container);
  return editor.on('change:targetValue', function() {
    return $slider.slider({
      value: editor.get('targetValue')
    });
  });
};

loadGradient = function(name, url) {
  var $canvas, ctx, imageObj;
  $canvas = $('<canvas/>').attr({
    width: 512,
    height: 1
  });
  ctx = $canvas[0].getContext('2d');
  imageObj = new Image();
  imageObj.onload = function() {
    var data, imageData;
    ctx.drawImage(this, 0, 0);
    imageData = ctx.getImageData(0, 0, 512, 1);
    data = new Uint32Array(imageData.data.buffer);
    return GradientRenderer.properties.gradient = {
      lut: data
    };
  };
  return imageObj.src = url;
};

loadGradient('g1', 'img/gradient-1.png');

$(document).ready(function() {
  var doc;
  doc = new Document(512, 512);
  fillLayer(doc.layer, function(x, y) {
    return -1;
  });
  view = new DocumentView($('.document-view'), doc);
  createToolsButtons($('#tools > .buttons'));
  createRenderersButtons($('#renderers > .buttons'));
  createPalette($('#palette'));
  createCommandsButtons($('#commands'));
  editor.set('doc', doc);
  editor.set('tool', RoundBrush);
  editor.set('renderer', GammaRenderer);
  return editor.set('targetValue', 0.0);
});
