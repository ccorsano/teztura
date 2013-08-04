
class Document
  constructor: (@width,@height)->
    @layer = new Layer(@width,@height)

Editor = Backbone.Model.extend({
  toolObject: null
  getToolObject: ()->
    if @get('toolObject') is null
      console.log "Creating brush of type " + @get("tool").description.name
      o = @get('tool').createTool(this)
      @set('toolObject', o)
    return @get('toolObject')
  setToolDirty: ()->
    @set('toolObject', null)
})

editor = new Editor {
  tool: null
  renderer: null
  tiling: true
  targetValue: 1.0
}

Renderers = [GammaRenderer, NormalRenderer]
Tools = [RoundBrush, Picker]

class DocumentView
  drawing: false
  panning: false
  imageData: null
  context: null
  canvas: null
  backContext: null
  doc: null
  offset: new Vec2(0.0, 0.0)
  scale: 1.0

  constructor: ($container, doc)->
    @doc = doc
    $container.empty()
    $canvas = $('<canvas/>',{'class':''}).attr {width: doc.width, height:doc.height}
    $backCanvas = $('<canvas/>',{'class':''}).attr {width: doc.width, height:doc.height}
    $container.append($backCanvas)

    @backContext = $backCanvas[0].getContext('2d')
    @canvas = $canvas[0] 
    @context = $canvas[0].getContext('2d')
    @imageData = @context.getImageData(0,0,doc.width,doc.height)

    @context.mozImageSmoothingEnabled = false

    self = this

    getCoords = (e)->
      x = e.pageX-$backCanvas.position().left
      y = e.pageY-$backCanvas.position().top
      return new Vec2(x,y)

    getCanvasCoords = (e)->
      v = getCoords(e)
      return self.screenToCanvas(v)

    local = {}

    $container.mousedown (e)->
      e.preventDefault()
      if e.which is 1
        self.drawing = true
        coords = getCanvasCoords(e)
        editor.getToolObject().beginDraw(coords)
        self.onDraw(coords)

      if e.which is 2
        self.panning = true
        local.panningStart = getCoords(e)
        local.offsetStart = self.offset.clone()

    $container.mouseup (e)->
      if e.which is 1
        editor.getToolObject().endDraw(getCanvasCoords(e))
        self.drawing = false

      if e.which is 2
        self.panning = false

    $container.mousemove (e)->
      if self.drawing
        self.onDraw(getCanvasCoords(e))

      if self.panning
        curPos = getCoords(e)
        o = local.offsetStart.add(curPos.sub(local.panningStart))
        lim = 200.0
        self.offset.x = Math.min(Math.max(o.x, -lim), lim)
        self.offset.y = Math.min(Math.max(o.y, -lim), lim)
        self.rePaint()
 
  screenToCanvas: (pt)->
    return pt.sub(@offset).scale(1.0/@scale)

  reRender: ()->
    layer = @doc.layer
    editor.get('renderer').renderLayer(layer, this, [new Rect(0,0,@doc.width,@doc.height)])
    @rePaint()

  rePaint: ()->
    ctx = @backContext
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(@offset.x, @offset.y)
    ctx.scale(@scale, @scale)
    
    if editor.get('tiling')
      ctx.fillStyle = ctx.createPattern(@canvas,"repeat")
      ctx.fillRect(-@offset.x / @scale,-@offset.y / @scale,@canvas.width / @scale, @canvas.height / @scale)
    else
      ctx.drawImage(@canvas, 0, 0)

  onDraw: (pos)->
    self = this

    pressure = getPenPressure()
    dirtyRects = []

    layer = @doc.layer
    tool = editor.getToolObject()

    layerRect = layer.getRect()
    
    r = tool.draw(layer, pos, pressure).round()

    if editor.get('tiling')
      for xoff in [-1,0,1]
        for yoff in [-1,0,1]
          dirtyRects.push(r.offset(new Vec2(xoff * layerRect.width, yoff * layerRect.height)))
    else
      dirtyRects.push(r)

    dirtyRects = dirtyRects
      .map((r)->r.intersect(layerRect))
      .filter((r)->not r.isEmpty())

    if true
    #setTimeout (()->
      editor.get('renderer').renderLayer(layer, self, dirtyRects)
      self.rePaint()
    #), 0

# ---

getPenPressure = () ->
  plugin = document.getElementById('wtPlugin')
  penAPI = plugin.penAPI
  if penAPI and penAPI.pointerType > 0
    return penAPI.pressure
  return 1.0

# ---

status = (txt)->
  $('#status-bar').text(txt)

view = null


editor.on 'change:tool', ()->
  editor.setToolDirty()
  tool = editor.get('tool')

  # Create properties
  $container = $('#tools > .properties')
  $container.empty()
  $.each tool.properties, (_,prop)->
    $prop = $('<div/>').attr({'class':'property'}).appendTo($container)
    $('<span/>').text(prop.name).appendTo($prop)
    if prop.range?
      $slider = $('<div/>').slider({
        min: prop.range[0]
        max: prop.range[1]
        value: prop.value
        step: 0.01
        change: (evt, ui)->
          prop.value = ui.value
          editor.setToolDirty()
      }).width(200).appendTo($prop)
      $prop.append($slider)

editor.on 'change:renderer', ()->
  view.reRender()
  view.rePaint()

createToolsButtons = ($container)->
  $container.empty()
  Tools.forEach (b)->
    name = b.description.name
    $btn = $('<button/>').attr({'class':'btn'}).text(name)
    $btn.click (e)->
      editor.set('tool', b)
    $container.append($btn)

createRenderersButtons = ($container)->
  $container.empty()
  Renderers.forEach (r)->
    name = r.description.name
    $btn = $('<button/>').attr({'class':'btn'}).text(name)
    $btn.click (e)->
      editor.set('renderer', r)
    $container.append($btn)

$(document).ready ()->
  doc = new Document(512, 512)
  fillLayer doc.layer, (x,y)->
    x += 1.0
    y += 1.0
    return (Math.round(x*40) % 2) * 0.1 -
        (Math.round(y*40) % 2) * 0.1

  view = new DocumentView($('.document-view'), doc)

  createToolsButtons($('#tools > .buttons'))
  createRenderersButtons($('#renderers > .buttons'))

  editor.set('tool', RoundBrush)
  editor.set('renderer', GammaRenderer)
