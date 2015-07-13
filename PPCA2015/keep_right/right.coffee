C =
    vehicles:
        car:   size: 1, maxSpeed: 6, color: 0xFF0000
        bus:   size: 2, maxSpeed: 5, color: 0x00FF00
        truck: size: 2, maxSpeed: 3, color: 0x0000FF
    pSlow: 0
    numLanes: 5
    numCells: 200
    numVehicles: 200
    sightCells: 10

    rowMargin: 20
    pxCellWidth:  18
    pxCellHeight: 12

    ticksPerSimulation: 60

C.rowHeight = C.pxCellHeight * C.numLanes
C.numRows = Math.ceil C.numCells / C.cellsPerLane
C.width = C.numCells * C.pxCellWidth
C.height = C.rowHeight

class Vehicle
    constructor: (@lane, @cell, @speed) ->

class Car extends Vehicle
    size:     C.vehicles.car.size
    maxSpeed: C.vehicles.car.maxSpeed

class Bus extends Vehicle
    size:     C.vehicles.bus.size
    maxSpeed: C.vehicles.bus.maxSpeed

class Truck extends Vehicle
    size:     C.vehicles.truck.size
    maxSpeed: C.vehicles.truck.maxSpeed

class Graphics
    constructor: (@lane, @cell, @color, @size, @index) ->
        @graphics = new PIXI.Graphics()
        @graphics.lineStyle(1, 0x000000, 0.7)
        @graphics.beginFill(@color, 0.7)
        @graphics.drawRect(0, 0, C.pxCellWidth*@size, C.pxCellHeight)
        @graphics.endFill()
        @graphics.interactive = true
        @graphics.on('mousedown', (e) => console.log(@index, vehicles[@index]))
        @oldx = @oldy = @newx = @newy = 0
        @setNewPosition(@lane, @cell)
        @setNewPosition(@lane, @cell)
    setNewPosition: (@lane, @cell) ->
        rlane = C.numLanes - @lane - 1
        @oldx = @newx
        @oldy = @newy
        @newx = @cell * C.pxCellWidth + C.pxCellWidth/2
        @newy = rlane*C.pxCellHeight
        if (@newx < @oldx)
            @oldx = @newx
            @oldy = @newy
    update: (drawTick) ->
        dx = (@newx-@oldx) / C.ticksPerSimulation
        dy = (@newy-@oldy) / C.ticksPerSimulation
        @graphics.x = @oldx + dx*drawTick
        @graphics.y = @oldy + dy*drawTick


# Variables
vehicles = null
graphics = null
cells    = null
renderer = null
stage    = null

move = (vehicle) ->
    # (a) Determine the speed
    v = vehicle.speed
    v = v+1 if v < vehicle.maxSpeed
    v = v-1 if v > 3 and Math.random() < C.pSlow
    fve = getFrontVehicle(vehicle.lane, vehicle.cell+vehicle.size)
    gap = if fve then fve.cell-vehicle.cell-vehicle.size else Infinity
    #relv = if fve then v-fve.speed else 0
    #v = gap + fve.speed if gap < relv
    relv = if fve then v-3 else 0
    v = gap + 3 if gap < relv

    # (b) Determine the location
    vehicle.cell = inc(vehicle.cell, v)
    vehicle.speed = v

laneChange = (vehicle) ->
    # (a) Change to the left lane
    if vehicle.lane < C.numLanes-1 and vehicle.speed < vehicle.maxSpeed
        fgap = getGap(vehicle)
        lfgap = getLeftFrontGap(vehicle)
        lbgap = getLeftBehindGap(vehicle)
        if fgap.gap < vehicle.maxSpeed and lbgap.gap > lbgap.relv and lfgap.gap > lfgap.relv
            return +1

    # (b) Change to the right lane
    if vehicle.lane > 0
        rfgap = getRightFrontGap(vehicle)
        rbgap = getRightBehindGap(vehicle)
        if rfgap.gap > rfgap.relv and rbgap.gap > rbgap.relv
            return -1
    0

# Simulate Calculation
simulate = ->
    laneChanges = (laneChange v for v in vehicles)
    for i in [0 .. C.numVehicles-1]
        old = vehicles[i]
        cells[old.lane][old.cell] = null
    for i in [0 .. C.numVehicles-1]
        now = vehicles[i]
        now.lane += laneChanges[i]
        cells[now.lane][now.cell] = now

    newv = clone vehicles
    move now for now in newv
    for i in [0 .. C.numVehicles-1]
        old = vehicles[i]
        cells[old.lane][old.cell] = null
    for i in [0 .. C.numVehicles-1]
        now = newv[i]
        cells[now.lane][now.cell] = now
    vehicles = newv

# Supporting Function
getFrontVehicle = (lane, cell) ->
    j = cell
    step = 0
    while step < C.sightCells and j < C.numCells and not cells[lane][j]
        ++step
        ++j
    cells[lane][j]

getBehindVehicle = (lane, cell)->
    j = cell
    step = 0
    while step < C.sightCells and j >= 0 and not cells[lane][j]
        ++step
        --j
    cells[lane][j]

returnFrontGap = (vehicle, v) ->
    if v
        gap: v.cell-vehicle.cell-vehicle.size
        relv: vehicle.speed-v.speed
    else
        gap: Infinity
        relv: 0

returnBehindGap = (vehicle, v) ->
    if v
        gap: vehicle.cell-v.cell-v.size
        relv: v.speed-vehicle.speed
    else
        gap: Infinity
        relv: 0

getGap = (vehicle) ->
    v = getFrontVehicle(vehicle.lane, vehicle.cell+vehicle.size)
    returnFrontGap(vehicle, v)

getLeftFrontGap = (vehicle) ->
    v = getFrontVehicle(vehicle.lane+1, vehicle.cell)
    returnFrontGap(vehicle, v)

getRightFrontGap = (vehicle) ->
    v = getFrontVehicle(vehicle.lane-1, vehicle.cell)
    returnFrontGap(vehicle, v)

getLeftBehindGap = (vehicle) ->
    v = getBehindVehicle(vehicle.lane+1, vehicle.cell)
    returnBehindGap(vehicle, v)

getRightBehindGap = (vehicle) ->
    v = getBehindVehicle(vehicle.lane-1, vehicle.cell)
    returnBehindGap(vehicle, v)

random = (hi) ->
    Math.floor Math.random() * hi

inc = (x, y=1) -> if x+y < C.numCells then x+y else x+y-C.numCells
dec = (x, y=1) -> if x-y >= 0 then x-y else x-y+C.numCells

drawRoad = ->
    road_renderer = new PIXI.autoDetectRenderer(C.width, C.height)
    road_stage = new PIXI.Container()
    road_renderer.backgroundColor = 0xFFFFFF
    document.getElementById('road').appendChild(road_renderer.view)
    g = new PIXI.Graphics()
    dashInterval = C.pxCellWidth

    g.lineStyle(2, 0x000000, 1)
    g.drawRect(0, 0, C.width, C.rowHeight)
    g.endFill()

    y = 0
    for lane in [0 .. C.numLanes-1]
        g.lineStyle(1, 0x000000, 1)
        for x in [0 .. C.width-dashInterval] by dashInterval*2
            g.moveTo(x, y)
            g.lineTo(x+dashInterval, y)
        g.endFill()
        y += C.pxCellHeight

    road_stage.addChild g
    road_renderer.render(road_stage)

init = ->
    vehicles = []
    graphics = []
    cells = []
    renderer = new PIXI.autoDetectRenderer(C.width, C.height, {transparent: true})
    stage = new PIXI.Container()
    document.getElementById('vehicle').appendChild(renderer.view)
    for i in [0 .. C.numLanes-1]
        cells.push([])
        for j in [0 .. C.numCells-1]
            cells[i].push(null)
    for i in [0 .. C.numVehicles-1]
        x = y = v = t = now = null
        while true
            x = random(C.numLanes)
            y = random(C.numCells)
            rand = Math.random()
            if rand < .1
                t = "truck"
            else if rand < .4
                t = "bus"
            else
                t = "car"
            v = random(C.vehicles[t].maxSpeed - 3) + 3
            l = C.vehicles[t].size
            y2 = y
            step = 0
            while step < l and not cells[x][y2]
                ++step
                y2 = inc(y2)
            break if step == l
        switch t
            when "car" then now = new Car(x, y, v)
            when "bus" then now = new Bus(x, y, v)
            when "truck" then now = new Truck(x, y, v)

        vehicles.push now
        cells[x][y] = now

        g = new Graphics(x, y, C.vehicles[t].color, now.size, i)
        graphics.push g
        stage.addChild g.graphics

    drawRoad()
    draw()

drawTick = 0
draw = ->
    requestAnimationFrame(draw)
    ++drawTick
    if drawTick == C.ticksPerSimulation
        drawTick = 0
        simulate()
        for i in [0 .. C.numVehicles-1]
            v = vehicles[i]
            g = graphics[i]
            g.setNewPosition(v.lane, v.cell)

    g.update drawTick for g in graphics
    renderer.render(stage)

# Deep Copy
clone = (obj) ->
  return obj  if obj is null or typeof (obj) isnt "object"
  temp = new obj.constructor()
  for key of obj
    temp[key] = clone(obj[key])
  temp


# Start!
init()
