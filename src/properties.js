// Generated by CoffeeScript 1.6.3
var PropertyPanel, PropertyView;

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