var BlendModes, Commands, Document, DocumentView, Editor, FlattenBrush, Matcaps, Picker, PreviewWebGL, PropertyPanel, PropertyView, Renderers, RoundBrush, StepBrush, Tools, createCommandsButtons, createPalette, createRenderersButtons, createToolsButtons, editor, loadGradient, loadMatcaps, refresh, status, toolsProperties, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Renderers = null;

Tools = null;

editor = null;

toolsProperties = null;

Matcaps = [];

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
  }, {
    name: "Invert",
    func: function(doc) {
      var buf, len;
      buf = doc.layer.getBuffer();
      len = buf.length;
      for(var i=0; i<len; ++i) {
        buf[i] = -buf[i];
      }
      ;
      return refresh();
    }
  }, {
    name: "Flip H",
    func: function(doc) {
      var buf, halfw, height, len, maxx, tmp, width;
      buf = doc.layer.getBuffer();
      len = buf.length;
      height = doc.layer.height;
      width = doc.layer.width;
      halfw = Math.floor(doc.layer.width / 2.0);
      maxx = doc.layer.width - 1;
      tmp = 0.0;
      for(var iy=0; iy<height; ++iy) {
        var offset = iy * width
        for(var ix=0; ix<halfw; ++ix) {
          tmp = buf[offset + ix];
          buf[offset + ix] = buf[offset + maxx - ix];
          buf[offset + maxx - ix] = tmp;
        }
      }
      ;
      return refresh();
    }
  }, {
    name: "Flip V",
    func: function(doc) {
      var buf, halfh, height, len, maxy, tmp, width;
      buf = doc.layer.getBuffer();
      len = buf.length;
      height = doc.layer.height;
      width = doc.layer.width;
      halfh = Math.floor(doc.layer.width / 2.0);
      maxy = doc.layer.width - 1;
      tmp = 0.0;
      for(var iy=0; iy<halfh; ++iy) {
        for(var ix=0; ix<width; ++ix) {
          tmp = buf[iy*width + ix];
          buf[iy*width + ix] = buf[(maxy - iy)*width + ix];
          buf[(maxy - iy)*width + ix] = tmp;
        }
      }
      ;
      return refresh();
    }
  }
];

Editor = (function(_super) {
  __extends(Editor, _super);

  function Editor() {
    _ref = Editor.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Editor.prototype.defaults = function() {
    return {
      doc: null,
      tool: null,
      preset: null,
      renderer: null,
      tiling: true,
      targetValue: 1.0,
      altkeyDown: false
    };
  };

  Editor.prototype.initialize = function() {
    this.toolObject = null;
    this.on('change:tool', function() {
      var tool;
      this.setToolDirty();
      tool = this.get('tool');
      return toolsProperties.setTool(tool);
    });
    this.on('change:preset', function() {
      var p;
      p = this.get('preset');
      return this.set('tool', p.tools[0]);
    });
    this.on('change:altkeyDown', function() {
      var idx, p;
      idx = this.get('altkeyDown') ? 1 : 0;
      p = this.get('preset');
      return this.set('tool', p.tools[idx]);
    });
    return this.on('change:renderer', function() {
      this.get('view').reRender();
      return this.get('view').rePaint();
    });
  };

  Editor.prototype.createDoc = function(w, h) {
    var doc;
    doc = new Document(512, 512);
    fillLayer(doc.layer, function(x, y) {
      return -1;
    });
    this.set('doc', doc);
    return this.set('view', new DocumentView($('.document-view'), doc));
  };

  Editor.prototype.getToolObject = function() {
    var o;
    if (this.get('toolObject') === null) {
      console.log("Creating brush of type " + this.get("tool").description.name);
      o = this.get('tool').createTool(this);
      this.set('toolObject', o);
    }
    return this.get('toolObject');
  };

  Editor.prototype.setToolDirty = function() {
    return this.set('toolObject', null);
  };

  Editor.prototype.refresh = function() {
    var v;
    v = this.get('view');
    v.reRender();
    return v.rePaint();
  };

  return Editor;

})(Backbone.Model);

status = function(txt) {
  return $('#status-bar').text(txt);
};

refresh = function() {
  return editor.refresh();
};

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
    value: editor.get('targetValue'),
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
    var imageData;
    ctx.drawImage(this, 0, 0);
    imageData = ctx.getImageData(0, 0, 512, 1);
    return GradientRenderer.properties.gradient = {
      lut: imageData.data
    };
  };
  return imageObj.src = url;
};

loadMatcaps = function(defs) {
  var $canvas, ctx;
  $canvas = $('<canvas/>').attr({
    width: 512,
    height: 512
  });
  ctx = $canvas[0].getContext('2d');
  return defs.forEach(function(matcapDef) {
    var imageObj;
    imageObj = new Image();
    imageObj.onload = function() {
      var imageData;
      console.log("Loaded matcap " + matcapDef.name);
      ctx.drawImage(this, 0, 0);
      imageData = ctx.getImageData(0, 0, 512, 512);
      matcapDef.data = imageData.data;
      Matcaps.push(matcapDef);
      if (MatcapRenderer.properties.matcap == null) {
        return MatcapRenderer.properties.matcap = matcapDef;
      }
    };
    return imageObj.src = matcapDef.url;
  });
};

$(window).keydown(function(e) {
  if (e.key === 'Control') {
    editor.set('altkeyDown', true);
  }
  if (e.ctrlKey) {
    switch (e.keyCode) {
      case 90:
        editor.get('doc').undo();
        return editor.refresh();
      case 89:
        editor.get('doc').redo();
        return editor.refresh();
    }
  }
});

$(window).keyup(function(e) {
  if (e.key === 'Control') {
    return editor.set('altkeyDown', false);
  }
});

$(document).ready(function() {
  var testWebGL;
  loadGradient('g1', 'img/gradient-1.png');
  loadMatcaps([
    {
      name: 'clay2',
      url: 'img/matcaps/clay_2.jpg'
    }
  ]);
  Renderers = [GammaRenderer, GradientRenderer, NormalRenderer, MatcapRenderer];
  Tools = [RoundBrush, Picker, FlattenBrush];
  toolsProperties = new PropertyPanel('#tools > .properties');
  editor = new Editor();
  editor.createDoc(512, 512);
  testWebGL = new PreviewWebGL($('#TestWebGL')[0]);
  createToolsButtons($('#tools > .buttons'));
  createRenderersButtons($('#renderers > .buttons'));
  createPalette($('#palette'));
  createCommandsButtons($('#commands'));
  editor.set('preset', {
    tools: [RoundBrush, FlattenBrush]
  });
  return editor.set('renderer', GammaRenderer);
});

DocumentView = (function() {
  DocumentView.prototype.drawing = false;

  DocumentView.prototype.panning = false;

  DocumentView.prototype.imageData = null;

  DocumentView.prototype.context = null;

  DocumentView.prototype.canvas = null;

  DocumentView.prototype.backContext = null;

  DocumentView.prototype.doc = null;

  DocumentView.prototype.offset = new Vec2(0.0, 0.0);

  DocumentView.prototype.scale = 2.0;

  DocumentView.prototype.penPos = new Vec2(0, 0);

  function DocumentView($container, doc) {
    var $backCanvas, $canvas, getCanvasCoords, getMouseCoords, getPressure, local, penAPI, plugin, updatePen,
      _this = this;
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
    plugin = document.getElementById('wtPlugin');
    penAPI = plugin != null ? plugin.penAPI : null;
    getMouseCoords = function(e) {
      var v;
      v = new Vec2(e.pageX, e.pageY);
      /*
      penAPI = plugin.penAPI
      if penAPI? and penAPI.pointerType > 0
        v.x += penAPI.sysX - penAPI.posX
        v.y += penAPI.sysY - penAPI.posY
      */

      v.x -= $backCanvas.position().left;
      v.y -= $backCanvas.position().top;
      return v;
    };
    getPressure = function() {
      if ((penAPI != null) && penAPI.pointerType > 0) {
        return penAPI.pressure;
      }
      return 1.0;
    };
    updatePen = function(e) {
      var pos;
      pos = getMouseCoords(e);
      return _this.penPos = _this.penPos.add(pos.sub(_this.penPos).scale(0.6));
    };
    getCanvasCoords = function() {
      return _this.screenToCanvas(_this.penPos);
    };
    local = {};
    $backCanvas.mousedown(function(e) {
      var coords;
      e.preventDefault();
      if (e.which === 1) {
        _this.drawing = true;
        _this.actionDirtyRect = null;
        coords = getCanvasCoords();
        editor.getToolObject().beginDraw(doc.layer, coords);
        doc.beginEdit();
        _this.onDraw(coords, getPressure());
      }
      if (e.which === 2) {
        _this.panning = true;
        local.panningStart = getMouseCoords(e);
        return local.offsetStart = _this.offset.clone();
      }
    });
    $container.mouseup(function(e) {
      e.preventDefault();
      if (e.which === 1) {
        editor.getToolObject().endDraw(getCanvasCoords());
        _this.drawing = false;
        if (_this.actionDirtyRect != null) {
          doc.afterEdit(_this.actionDirtyRect);
        }
      }
      if (e.which === 2) {
        return _this.panning = false;
      }
    });
    $container.mousemove(function(e) {
      var curPos, o;
      e.preventDefault();
      updatePen(e);
      if (_this.drawing) {
        _this.onDraw(getCanvasCoords(), getPressure());
      }
      if (_this.panning) {
        curPos = getMouseCoords(e);
        o = local.offsetStart.add(curPos.sub(local.panningStart));
        _this.offset = o;
        return _this.rePaint();
      }
    });
    $container.mousewheel(function(e, delta, deltaX, deltaY) {
      var mult;
      mult = 1.0 + (deltaY * 0.25);
      _this.scale *= mult;
      return _this.rePaint();
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

  DocumentView.prototype.onDraw = function(pos, pressure) {
    var dirtyRects, layer, layerRect, r, tool, totalArea, xoff, yoff, _i, _j, _len, _len1, _ref1, _ref2,
      _this = this;
    dirtyRects = [];
    layer = this.doc.layer;
    tool = editor.getToolObject();
    layerRect = layer.getRect();
    r = tool.draw(layer, pos, pressure).round();
    if (editor.get('tiling')) {
      _ref1 = [-1, 0, 1];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        xoff = _ref1[_i];
        _ref2 = [-1, 0, 1];
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          yoff = _ref2[_j];
          dirtyRects.push(r.offset(new Vec2(xoff * layerRect.width, yoff * layerRect.height)));
        }
      }
    } else {
      dirtyRects.push(r.intersect(layerRect));
    }
    dirtyRects = dirtyRects.map(function(r) {
      return r.intersect(layerRect);
    }).filter(function(r) {
      return !r.isEmpty();
    });
    dirtyRects.forEach(function(r) {
      if (_this.actionDirtyRect == null) {
        return _this.actionDirtyRect = r.clone();
      } else {
        return _this.actionDirtyRect.extend(r);
      }
    });
    if (false) {
      totalArea = dirtyRects.map(function(r) {
        return r.width * r.height;
      }).reduce(function(a, b) {
        return a + b;
      });
      console.log("" + dirtyRects.length + " rects, " + (Math.round(Math.sqrt(totalArea))) + " px²");
    }
    if (true) {
      editor.get('renderer').renderLayer(layer, this, dirtyRects);
      return this.rePaint();
    }
  };

  return DocumentView;

})();

Document = (function() {
  function Document(width, height) {
    this.width = width;
    this.height = height;
    this.layer = new Layer(this.width, this.height);
    this.backup = new Layer(this.width, this.height);
    this.history = [];
    this.histIndex = 1;
  }

  Document.prototype.beginEdit = function() {
    if (this.histIndex > 0) {
      this.history.splice(0, this.histIndex);
      this.histIndex = 0;
      return this.backup.getBuffer().set(this.layer.getBuffer());
    }
  };

  Document.prototype.afterEdit = function(rect) {
    var histSize;
    this.history.splice(0, 0, {
      data: this.backup.getCopy(rect),
      rect: rect
    });
    this.backup.getBuffer().set(this.layer.getBuffer());
    histSize = 10;
    if (this.history.length >= histSize) {
      return this.history.splice(histSize);
    }
  };

  Document.prototype.undo = function() {
    if (this.histIndex >= this.history.length) {
      return;
    }
    this.restore();
    return this.histIndex++;
  };

  Document.prototype.redo = function() {
    if (this.histIndex === 0) {
      return;
    }
    this.histIndex--;
    return this.restore();
  };

  Document.prototype.restore = function() {
    var rect, toRestore;
    toRestore = this.history[this.histIndex];
    rect = toRestore.rect;
    this.history[this.histIndex] = {
      data: this.layer.getCopy(rect),
      rect: rect
    };
    return this.layer.setData(toRestore.data, toRestore.rect);
  };

  return Document;

})();

PreviewWebGL = (function() {
  function PreviewWebGL(container) {
    this.container = container;
    this.Init = __bind(this.Init, this);
    this.Init();
  }

  PreviewWebGL.prototype.Init = function() {
    var ambientLight, directionalLight,
      _this = this;
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 10000);
    this.camera.position.z = 900;
    this.scene = new THREE.Scene();
    ambientLight = new THREE.AmbientLight(0x222222);
    this.scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffeedd, 1);
    directionalLight.position.set(1, -1, 1).normalize();
    this.scene.add(directionalLight);
    this.sphereMaterial = new THREE.MeshLambertMaterial({
      color: 0xCC0000
    });
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 32), this.sphereMaterial);
    this.scene.add(this.sphere);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false
    });
    this.renderer.setSize(512, 512);
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);
    return requestAnimationFrame(function(timestamp) {
      return _this.Render(timestamp);
    });
  };

  PreviewWebGL.prototype.Render = function(timestamp) {
    this.renderer.clear();
    return this.renderer.render(this.scene, this.camera);
  };

  return PreviewWebGL;

})();

PropertyView = Backbone.View.extend({
  className: "property",
  initialize: function() {
    var $input, $slider, conv, invconv, power, prop, rmax, rmin, step, tool;
    tool = this.model.tool;
    prop = this.model.prop;
    $('<span/>').text(prop.name).appendTo(this.$el);
    if (prop.range != null) {
      power = prop.power || 1.0;
      conv = function(v) {
        return Math.pow(v, power);
      };
      invconv = function(v) {
        return Math.pow(v, 1.0 / power);
      };
      rmin = invconv(prop.range[0]);
      rmax = invconv(prop.range[1]);
      step = prop.type === 'int' ? 1 : (rmax - rmin) / 100;
      $slider = $('<div/>').slider({
        min: rmin,
        max: rmax,
        value: invconv(tool.get(prop.id)),
        step: step,
        change: function(evt, ui) {
          tool.set(prop.id, conv(ui.value));
          return editor.setToolDirty();
        }
      }).width(200).appendTo(this.$el);
      $input = $('<input/>').val(tool.get(prop.id)).appendTo(this.$el).change(function(evt) {
        if (prop.type === 'int') {
          return tool.set(prop.id, parseInt($input.val()));
        } else {
          return tool.set(prop.id, parseFloat($input.val()));
        }
      });
      return this.listenTo(this.model.tool, "change:" + prop.id, function() {
        var v;
        v = tool.get(prop.id);
        $input.val(v);
        return $slider.slider("value", invconv(v));
      });
    }
  }
});

PropertyPanel = (function() {
  function PropertyPanel(selector) {
    this.selector = selector;
    this.views = [];
  }

  PropertyPanel.prototype.setTool = function(tool) {
    var _this = this;
    this.removeViews();
    return tool.properties.forEach(function(prop) {
      var v;
      v = new PropertyView({
        model: {
          prop: prop,
          tool: tool
        }
      });
      $(_this.selector).append(v.$el);
      return _this.views.push(v);
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

StepBrush = (function() {
  function StepBrush() {}

  StepBrush.prototype.drawing = false;

  StepBrush.prototype.lastpos = null;

  StepBrush.prototype.accumulator = 0.0;

  StepBrush.prototype.stepSize = 4.0;

  StepBrush.prototype.nsteps = 0;

  StepBrush.prototype.tiling = false;

  StepBrush.prototype.drawStep = function(layer, pos, intensity, rect) {
    var fb;
    fb = layer.getBuffer();
    fb[Math.floor(pos.x) + Math.floor(pos.y) * layer.width] = intensity;
    return rect.extend(pos);
  };

  StepBrush.prototype.move = function(pos, pressure) {};

  StepBrush.prototype.draw = function(layer, pos, pressure) {
    var delt, dir, intensity, length, pt, rect, wpos;
    wpos = this.tiling ? pos.wrap(layer.width, layer.height) : pos;
    rect = new Rect(wpos.x, wpos.y, 1, 1);
    intensity = pressure;
    if (this.lastpos != null) {
      delt = pos.sub(this.lastpos);
      length = delt.length();
      dir = delt.scale(1.0 / length);
      while (this.accumulator + this.stepSize <= length) {
        this.accumulator += this.stepSize;
        pt = this.lastpos.add(dir.scale(this.accumulator));
        if (this.tiling) {
          pt = pt.wrap(layer.width, layer.height);
        }
        this.drawStep(layer, pt, intensity, rect);
        ++this.nsteps;
      }
      this.accumulator -= length;
    } else {
      this.drawStep(layer, wpos, intensity, rect);
      ++this.nsteps;
    }
    this.lastpos = pos;
    return rect;
  };

  StepBrush.prototype.beginDraw = function(layer, pos) {
    this.drawing = true;
    this.accumulator = 0;
    return this.nsteps = 0;
  };

  StepBrush.prototype.endDraw = function(pos) {
    this.lastpos = null;
    return this.drawing = false;
  };

  return StepBrush;

})();

BlendModes = {
  add: "{dst} += {src} * intensity",
  sub: "{dst} -= {src} * intensity",
  multiply: "{dst} *= 1 + {src} * intensity",
  blend: "{dst} = {dst} * (1 - intensity * {src}) + intensity * target * {src}"
};

Picker = (function() {
  return {
    description: {
      name: 'Picker'
    },
    properties: [],
    createTool: function(env) {
      return {
        beginDraw: function(layer, pos) {},
        endDraw: function(pos) {},
        move: function() {},
        draw: function(layer, pos, intensity) {
          env.set('targetValue', layer.getAt(pos));
          return Rect.Empty;
        }
      };
    }
  };
})();

RoundBrush = (function() {
  var createTool, description, properties, self;
  description = {
    name: 'Round'
  };
  properties = [
    {
      id: 'step',
      name: "Step %",
      defaultValue: 10,
      range: [0, 100]
    }, {
      id: 'hardness',
      name: "Hardness",
      defaultValue: 0.2,
      range: [0.0, 1.0]
    }, {
      id: 'size',
      name: "Size",
      defaultValue: 30.0,
      range: [1.0, 256.0],
      type: 'int'
    }, {
      id: 'blendMode',
      name: "Blend mode",
      defaultValue: "blend",
      choices: ["blend", "add", "sub", "multiply"]
    }, {
      id: 'intensity',
      name: "Intensity",
      defaultValue: 0.4,
      range: [0.0, 1.0],
      power: 2.0
    }
  ];
  self = new Backbone.Model;
  createTool = function(env) {
    var func, hardness, hardnessPlus1, sb, size;
    sb = new StepBrush();
    size = self.get('size');
    sb.stepSize = Math.round(self.get('step') * size / 100.0);
    if (sb.stepSize < 1) {
      sb.stepSize = 1;
    }
    sb.tiling = env.get('tiling');
    hardness = Math.pow(self.get('hardness'), 2.0) * 8.0;
    hardnessPlus1 = hardness + 1.0;
    func = genBrushFunc({
      args: "intensity, target, h, hp1",
      tiling: env.get('tiling'),
      blendExp: BlendModes[self.get('blendMode')],
      brushExp: "var d = Math.min(1.0, Math.max(0.0, (Math.sqrt(x*x + y*y) * hp1 - h)));                {out} = Math.cos(d * Math.PI) * 0.5 + 0.5;"
    });
    sb.drawStep = function(layer, pos, intensity, rect) {
      var r;
      r = new Rect(pos.x - size * 0.5, pos.y - size * 0.5, size, size);
      func(r, layer, intensity * self.get('intensity'), env.get('targetValue'), hardness, hardnessPlus1);
      return rect.extend(r.round());
    };
    return sb;
  };
  self.properties = properties;
  self.description = description;
  self.createTool = createTool;
  properties.forEach(function(p) {
    return self.set(p.id, p.defaultValue);
  });
  return self;
})();

FlattenBrush = (function() {
  var createTool, description, properties, self;
  description = {
    name: 'Flatten'
  };
  properties = [
    {
      id: 'step',
      name: "Step %",
      defaultValue: 10,
      range: [0, 100]
    }, {
      id: 'hardness',
      name: "Hardness",
      defaultValue: 0.2,
      range: [0.0, 1.0]
    }, {
      id: 'size',
      name: "Size",
      defaultValue: 30.0,
      range: [1.0, 256.0],
      type: 'int'
    }, {
      id: 'intensity',
      name: "Intensity",
      defaultValue: 0.1,
      range: [0.0, 1.0],
      power: 2.0
    }
  ];
  self = new Backbone.Model;
  createTool = function(env) {
    var func, hardness, hardnessPlus1, sb, size;
    sb = new StepBrush();
    size = self.get('size');
    sb.stepSize = Math.round(self.get('step') * size / 100.0);
    if (sb.stepSize < 1) {
      sb.stepSize = 1;
    }
    sb.tiling = env.get('tiling');
    hardness = Math.pow(self.get('hardness'), 2.0) * 8.0;
    hardnessPlus1 = hardness + 1.0;
    func = genBrushFunc({
      args: "intensity, h, normal, det",
      tiling: env.get('tiling'),
      brushExp: "var d = Math.min(1.0, Math.max(0.0, (Math.sqrt(x*x + y*y) * (h+1) - h)));                {out} = Math.cos(d * Math.PI) * 0.5 + 0.5;",
      blendExp: "var tar = (-normal.x * (rect.x + sx) - normal.y * (rect.y + sy) - det) / normal.z;                {dst} = {dst} * (1 - intensity * {src}) + intensity * tar * {src};"
    });
    sb.drawStep = function(layer, pos, intensity, rect) {
      var det, r, rad;
      r = new Rect(pos.x - size * 0.5, pos.y - size * 0.5, size, size);
      rad = Math.round(self.get('size') * 0.5 * 0.75);
      self.normal = layer.getNormalAt(pos, rad);
      self.origin = new Vec3(pos.x, pos.y, layer.getAt(pos));
      det = -self.normal.x * self.origin.x - self.normal.y * self.origin.y - self.normal.z * self.origin.z;
      func(r, layer, intensity * self.get('intensity'), hardness, self.normal, det);
      return rect.extend(r.round());
    };
    return {
      drawStep: function() {
        return StepBrush.prototype.drawStep.apply(sb, arguments);
      },
      draw: function() {
        return StepBrush.prototype.draw.apply(sb, arguments);
      },
      beginDraw: function(layer, pos) {
        self.normal = layer.getNormalAt(pos);
        self.origin = new Vec3(pos.x, pos.y, layer.getAt(pos));
        return StepBrush.prototype.beginDraw.apply(sb, arguments);
      },
      endDraw: function() {
        return StepBrush.prototype.endDraw.apply(sb, arguments);
      }
    };
  };
  self.properties = properties;
  self.description = description;
  self.createTool = createTool;
  properties.forEach(function(p) {
    return self.set(p.id, p.defaultValue);
  });
  return self;
})();

/*
//@ sourceMappingURL=teztura.js.map
*/