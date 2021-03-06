// Generated by CoffeeScript 1.6.3
var Commands, Editor, Matcaps, Renderers, Tools, createCommandsButtons, createPalette, createRenderersButtons, createToolsButtons, editor, loadGradient, loadMatcaps, refresh, status, toolsProperties, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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
