
Renderers = null
Tools = null
editor = null
toolsProperties = null
Matcaps = []

Commands = [
  {
    name: "Fill"
    func: (doc)->
      val = editor.get('targetValue')
      fillLayer doc.layer, (x,y)->
        return val
      refresh()
  },
  {
    name: "Invert"
    func: (doc)->
      buf = doc.layer.getBuffer()
      len = buf.length
      `for(var i=0; i<len; ++i) {
        buf[i] = -buf[i];
      }
      `      
      refresh()
  },
  {
    name: "Flip H"
    func: (doc)->
      buf = doc.layer.getBuffer()
      len = buf.length
      height = doc.layer.height
      width = doc.layer.width
      halfw = Math.floor(doc.layer.width / 2.0)
      maxx = doc.layer.width - 1;
      tmp = 0.0
      `for(var iy=0; iy<height; ++iy) {
        var offset = iy * width
        for(var ix=0; ix<halfw; ++ix) {
          tmp = buf[offset + ix];
          buf[offset + ix] = buf[offset + maxx - ix];
          buf[offset + maxx - ix] = tmp;
        }
      }
      `      
      refresh()
  },
  {
    name: "Flip V"
    func: (doc)->
      buf = doc.layer.getBuffer()
      len = buf.length
      height = doc.layer.height
      width = doc.layer.width
      halfh = Math.floor(doc.layer.width / 2.0)
      maxy = doc.layer.width - 1;
      tmp = 0.0
      `for(var iy=0; iy<halfh; ++iy) {
        for(var ix=0; ix<width; ++ix) {
          tmp = buf[iy*width + ix];
          buf[iy*width + ix] = buf[(maxy - iy)*width + ix];
          buf[(maxy - iy)*width + ix] = tmp;
        }
      }
      `      
      refresh()
  },
]

# ---


class Editor extends Backbone.Model
  defaults: ->
    doc: null
    tool: null
    preset: null
    renderer: null
    tiling: true
    targetValue: 1.0
    altkeyDown: false

  initialize: ->  
    @toolObject = null
    @on 'change:tool', ()->
      @setToolDirty()
      tool = @get('tool')
      toolsProperties.setTool(tool)

    @on 'change:preset', ->
      p = @get('preset')
      @set('tool', p.tools[0])

    @on 'change:altkeyDown', ->
      idx = if @get('altkeyDown') then 1 else 0
      p = @get('preset')
      @set('tool', p.tools[idx])

    @on 'change:renderer', ()->
      @get('view').reRender()
      @get('view').rePaint()

  createDoc: (w,h)->
    doc = new Document(512, 512)
    fillLayer doc.layer, (x,y)->
      return -1

    @set('doc', doc)
    @set('view', new DocumentView($('.document-view'), doc))

  getToolObject: ->
    if @get('toolObject') is null
      console.log "Creating brush of type " + @get("tool").description.name
      o = @get('tool').createTool(this)
      @set('toolObject', o)
    return @get('toolObject')

  setToolDirty: ->
    @set('toolObject', null)

  refresh: ->
    v = @get('view')
    v.reRender()
    v.rePaint()

# ---

status = (txt)->
  $('#status-bar').text(txt)

refresh = ()->
  editor.refresh()

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

createCommandsButtons = ($container)->
  Commands.forEach (cmd)->
    $btn = $('<button/>').
      attr({'class':'btn'}).
      text(cmd.name).
      appendTo($container)
    $btn.click (e)->
      cmd.func(editor.get('doc'))

createPalette = ($container)->
  $canvas = $('<canvas/>').attr {width: $container.width(), height:50}
  $container.append($canvas)
  ctx = $canvas[0].getContext('2d')

  repaint = ->
    val = Math.round(editor.get('targetValue') * 127.0 + 128.0)
    ctx.fillStyle = "rgb(#{val},#{val},#{val})"
    ctx.fillRect(0, 0, $canvas.width(), $canvas.height()/2)

    grd = ctx.createLinearGradient(0, 0, $canvas.width(), $canvas.height())
    grd.addColorStop(0, '#000')
    grd.addColorStop(1, '#fff')
    ctx.fillStyle = grd
    ctx.fillRect(0, $canvas.height()/2, $canvas.width(), $canvas.height()/2)

    ctx.strokeStyle = "#aaa";
    ctx.strokeRect(0, 0, $canvas.width(), $canvas.height())

  local = {}
  local.drag = false

  mouseEvt = (e)->
    if local.drag
      xpos = e.pageX - $container.position().left
      val = (xpos / $container.width()) * 2 - 1
      editor.set('targetValue', val)

  $container.mousedown (e)->
    local.drag = true
    mouseEvt(e)
  $(document).mouseup (e)->
    local.drag = false
  $container.mousemove mouseEvt

  editor.on 'change:targetValue', ->
    repaint()

  repaint()

loadGradient = (name, url)->
  $canvas = $('<canvas/>').attr {width: 512, height:1}
  ctx = $canvas[0].getContext('2d')
  imageObj = new Image()
  imageObj.onload = ()->
    ctx.drawImage(this, 0, 0);
    imageData = ctx.getImageData(0,0,512,1)
    GradientRenderer.properties.gradient = {
      lut: imageData.data
    }
  imageObj.src = url

loadMatcaps = (defs)->
  $canvas = $('<canvas/>').attr {width: 512, height:512}
  ctx = $canvas[0].getContext('2d')
  defs.forEach (matcapDef)->
    imageObj = new Image()
    imageObj.onload = ()->
      console.log "Loaded matcap " + matcapDef.name
      ctx.drawImage(this, 0, 0)
      imageData = ctx.getImageData(0,0,512,512)
      matcapDef.data = imageData.data
      Matcaps.push(matcapDef)

      # Set first by default
      if not MatcapRenderer.properties.matcap?
        MatcapRenderer.properties.matcap = matcapDef

    imageObj.src = matcapDef.url

# --



$(window).keydown (e)->
  if e.key is 'Control'
    editor.set('altkeyDown', true)

  if e.ctrlKey
    switch e.keyCode 
      when 90
        editor.get('doc').undo()
        editor.refresh()
      when 89
        editor.get('doc').redo()
        editor.refresh()

$(window).keyup (e)->
  if e.key is 'Control'
    editor.set('altkeyDown', false)

$(document).ready ()->

  loadGradient('g1', 'img/gradient-1.png')
  loadMatcaps([
    {name: 'clay2', url: 'img/matcaps/clay_2.jpg'}
    # {name: 'clay1', url: 'img/matcaps/clay_1.0.png'}
  ])

  #loadGradient('g2', 'img/gradient-2.png')

  Renderers = [GammaRenderer, GradientRenderer, NormalRenderer, MatcapRenderer]
  Tools = [RoundBrush, Picker, FlattenBrush]

  toolsProperties = new PropertyPanel '#tools > .properties'
  editor = new Editor()
  editor.createDoc(512, 512)

  testWebGL = new PreviewWebGL($('#TestWebGL')[0])

  createToolsButtons($('#tools > .buttons'))
  createRenderersButtons($('#renderers > .buttons'))
  createPalette($('#palette'))
  createCommandsButtons($('#commands'))
  
  editor.set('preset', {
    tools: [RoundBrush, FlattenBrush]
  })
  editor.set('renderer', GammaRenderer)

