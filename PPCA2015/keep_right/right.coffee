C =
    vehicles:
        car:   size: 1, maxSpeed: 6, color: 0xFF0000
        bus:   size: 2, maxSpeed: 5, color: 0x00FF00
        truck: size: 2, maxSpeed: 3, color: 0x0000FF
    pSlow: 0
    numLanes: 4
    numCells: 100
    numVehicles: 10
    sightCells: 10

    cellsPerLane: 50
    rowMargin: 20
    pxCellWidth:  18
    pxCellHeight: 12

    ticksPerSimulation: 60

C.rowHeight = C.pxCellHeight * C.numLanes
C.numRows = Math.ceil C.numCells / C.cellsPerLane
C.width = C.cellsPerLane * C.pxCellWidth
C.height = C.numRows * (C.rowHeight + C.rowMargin)

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
    constructor: (@lane, @cell, @color, @size) ->
        @graphics = new PIXI.Graphics()
        @graphics.lineStyle(1, 0x000000, 1)
        @graphics.beginFill(@color, 1)
        @graphics.drawRect(0, 0, C.pxCellWidth*@size, C.pxCellHeight)
        @graphics.endFill()
        @oldx = @oldy = @newx = @newy = 0
        @setNewPosition(@lane, @cell)
        @setNewPosition(@lane, @cell)
    setNewPosition: (@lane, @cell) ->
        row = Math.floor @cell / C.cellsPerLane
        rlane = C.numLanes - @lane - 1
        @oldx = @newx
        @oldy = @newy
        @newx = @cell % C.cellsPerLane * C.pxCellWidth + C.pxCellWidth/2
        @newy = row*(C.rowHeight+C.rowMargin) + rlane*C.pxCellHeight
        #if @newx < @oldx
        #    @oldx = 0
        #    @oldy = @newy
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

# Step1: Moving
move = (vehicle) ->
    # (a) Determine the speed
    v = vehicle.speed
    v = v+1 if v < vehicle.maxSpeed
    v = v-1 if Math.random() < C.pSlow
    gap = getGap(vehicle)
    v = gap if v > gap
    v = 3 if v < 3

    # (b) Determine the location
    vehicle.cell = inc(vehicle.cell, v)
    vehicle.speed = v

# Step2: Lane Change
laneChange = (vehicle) ->
    # (a) Change to the left lane
    if vehicle.lane < C.numLanes-1
        gap = getGap(vehicle)
        lfgap = getLeftFrontGap(vehicle)
        lbgap = getLeftBehindGap(vehicle)
        lbv = getBehindVehicle(vehicle.lane+1, vehicle.cell)
        lbv ?= 0
        if gap < vehicle.maxSpeed and gap < lfgap and lbgap > lbv
            return +1

    # (b) Change to the right lane
    if vehicle.lane > 0
        rfgap = getRightFrontGap(vehicle)
        rbgap = getRightBehindGap(vehicle)
        rbv = getBehindVehicle(vehicle.lane-1, vehicle.cell)
        rbv ?= 0
        if rfgap > vehicle.speed and rbgap > rbv
            return -1
    0

# Simulate Calculation
simulate = ->
    newv = clone vehicles
    move v for v in newv
    laneChanges = (laneChange v for v in vehicles)
    for i in [0 .. C.numVehicles-1]
        now = newv[i]
        now.lane += laneChanges[i]
        old = vehicles[i]
        cells[old.lane][old.cell] = null
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

getGap = (vehicle) ->
    v = getFrontVehicle(vehicle.lane, vehicle.cell+vehicle.size)
    if v then v.cell-vehicle.cell-vehicle.size else Infinity

getLeftFrontGap = (vehicle) ->
    v = getFrontVehicle(vehicle.lane+1, vehicle.cell)
    if v then v.cell-vehicle.cell-vehicle.size else Infinity

getRightFrontGap = (vehicle) ->
    v = getFrontVehicle(vehicle.lane-1, vehicle.cell)
    if v then v.cell-vehicle.cell-vehicle.size else Infinity

getLeftBehindGap = (vehicle) ->
    v = getBehindVehicle(vehicle.lane+1, vehicle.cell)
    if v then vehicle.cell-v.cell-v.size else Infinity

getRightBehindGap = (vehicle) ->
    v = getBehindVehicle(vehicle.lane-1, vehicle.cell)
    if v then vehicle.cell-v.cell-v.size else Infinity

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
    for row in [0 .. C.numRows-1]
        g.lineStyle(2, 0x000000, 1)
        g.drawRect(0, row*(C.rowHeight+C.rowMargin), C.width, C.rowHeight)
        g.endFill()

        y = row*(C.rowHeight+C.rowMargin)
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
            v = random(C.vehicles[t].maxSpeed - 2)
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

        g = new Graphics(x, y, C.vehicles[t].color, now.size)
        graphics.push g
        stage.addChild g.graphics

    drawRoad()
    draw()

drawTick = 0
window.draw = ->
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
