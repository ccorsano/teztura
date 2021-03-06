
class DocumentView
  drawing: false
  panning: false
  imageData: null
  context: null
  canvas: null
  backContext: null
  doc: null
  offset: new Vec2(0.0, 0.0)
  scale: 2.0
  penPos: new Vec2(0,0)

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

    plugin = document.getElementById('wtPlugin')
    penAPI = if plugin? then plugin.penAPI else null

 
    getMouseCoords = (e)=>
      v = new Vec2(e.pageX, e.pageY)

      ###
      penAPI = plugin.penAPI
      if penAPI? and penAPI.pointerType > 0
        v.x += penAPI.sysX - penAPI.posX
        v.y += penAPI.sysY - penAPI.posY
      ###
      v.x -= $backCanvas.position().left
      v.y -= $backCanvas.position().top
      return v

    getPressure = ()=>
      if penAPI? and penAPI.pointerType > 0
        return penAPI.pressure
      return 1.0

    updatePen = (e)=>
      pos = getMouseCoords(e)
      @penPos = @penPos.add( pos.sub(@penPos).scale(0.6) )

    getCanvasCoords = =>
      return @screenToCanvas(@penPos)

    local = {}

    $backCanvas.mousedown (e)=>
      e.preventDefault()

      if e.which is 1
        @drawing = true
        @actionDirtyRect = null
        coords = getCanvasCoords()
        editor.getToolObject().beginDraw(doc.layer, coords)
        doc.beginEdit()
        @onDraw(coords, getPressure())

      if e.which is 2
        @panning = true
        local.panningStart = getMouseCoords(e)
        local.offsetStart = @offset.clone()

    $container.mouseup (e)=>
      e.preventDefault()
      if e.which is 1
        editor.getToolObject().endDraw(getCanvasCoords())
        @drawing = false
        if @actionDirtyRect?
          doc.afterEdit(@actionDirtyRect)

      if e.which is 2
        @panning = false

    $container.mousemove (e)=>
      e.preventDefault()
      updatePen(e)

      if @drawing
        @onDraw(getCanvasCoords(), getPressure())

      if @panning
        curPos = getMouseCoords(e)
        o = local.offsetStart.add(curPos.sub(local.panningStart))
        @offset = o
        @rePaint()

    $container.mousewheel (e, delta, deltaX, deltaY)=>
      mult = 1.0 + (deltaY * 0.25)
      @scale *= mult
      @rePaint()

 
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

  onDraw: (pos, pressure)->
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
      dirtyRects.push(r.intersect(layerRect))

    dirtyRects = dirtyRects
      .map((r)->r.intersect(layerRect))
      .filter((r)->not r.isEmpty())

    dirtyRects.forEach (r)=>
      if not @actionDirtyRect?
        @actionDirtyRect = r.clone()
      else
        @actionDirtyRect.extend(r)

    if false # Log dirty rects
      totalArea = dirtyRects
        .map((r)-> r.width * r.height)
        .reduce((a,b)-> a+b)
      console.log "#{dirtyRects.length} rects, #{Math.round(Math.sqrt(totalArea))} px²"

    if true
    #setTimeout (()->
      editor.get('renderer').renderLayer(layer, @, dirtyRects)
      @rePaint()
    #), 0

