(function() {
  var Bus, C, Car, Graphics, Truck, Vehicle, cells, clone, dec, drawRoad, drawTick, getBehindVehicle, getFrontVehicle, getGap, getLeftBehindGap, getLeftFrontGap, getRightBehindGap, getRightFrontGap, graphics, inc, init, laneChange, move, random, renderer, simulate, stage, vehicles,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  C = {
    vehicles: {
      car: {
        size: 1,
        maxSpeed: 6,
        color: 0xFF0000
      },
      bus: {
        size: 2,
        maxSpeed: 5,
        color: 0x00FF00
      },
      truck: {
        size: 2,
        maxSpeed: 3,
        color: 0x0000FF
      }
    },
    pSlow: 0,
    numLanes: 4,
    numCells: 100,
    numVehicles: 10,
    sightCells: 10,
    cellsPerLane: 50,
    rowMargin: 20,
    pxCellWidth: 18,
    pxCellHeight: 12,
    ticksPerSimulation: 60
  };

  C.rowHeight = C.pxCellHeight * C.numLanes;

  C.numRows = Math.ceil(C.numCells / C.cellsPerLane);

  C.width = C.cellsPerLane * C.pxCellWidth;

  C.height = C.numRows * (C.rowHeight + C.rowMargin);

  Vehicle = (function() {
    function Vehicle(lane, cell, speed) {
      this.lane = lane;
      this.cell = cell;
      this.speed = speed;
    }

    return Vehicle;

  })();

  Car = (function(_super) {
    __extends(Car, _super);

    function Car() {
      return Car.__super__.constructor.apply(this, arguments);
    }

    Car.prototype.size = C.vehicles.car.size;

    Car.prototype.maxSpeed = C.vehicles.car.maxSpeed;

    return Car;

  })(Vehicle);

  Bus = (function(_super) {
    __extends(Bus, _super);

    function Bus() {
      return Bus.__super__.constructor.apply(this, arguments);
    }

    Bus.prototype.size = C.vehicles.bus.size;

    Bus.prototype.maxSpeed = C.vehicles.bus.maxSpeed;

    return Bus;

  })(Vehicle);

  Truck = (function(_super) {
    __extends(Truck, _super);

    function Truck() {
      return Truck.__super__.constructor.apply(this, arguments);
    }

    Truck.prototype.size = C.vehicles.truck.size;

    Truck.prototype.maxSpeed = C.vehicles.truck.maxSpeed;

    return Truck;

  })(Vehicle);

  Graphics = (function() {
    function Graphics(lane, cell, color, size) {
      this.lane = lane;
      this.cell = cell;
      this.color = color;
      this.size = size;
      this.graphics = new PIXI.Graphics();
      this.graphics.lineStyle(1, 0x000000, 1);
      this.graphics.beginFill(this.color, 1);
      this.graphics.drawRect(0, 0, C.pxCellWidth * this.size, C.pxCellHeight);
      this.graphics.endFill();
      this.oldx = this.oldy = this.newx = this.newy = 0;
      this.setNewPosition(this.lane, this.cell);
      this.setNewPosition(this.lane, this.cell);
    }

    Graphics.prototype.setNewPosition = function(lane, cell) {
      var rlane, row;
      this.lane = lane;
      this.cell = cell;
      row = Math.floor(this.cell / C.cellsPerLane);
      rlane = C.numLanes - this.lane - 1;
      this.oldx = this.newx;
      this.oldy = this.newy;
      this.newx = this.cell % C.cellsPerLane * C.pxCellWidth + C.pxCellWidth / 2;
      return this.newy = row * (C.rowHeight + C.rowMargin) + rlane * C.pxCellHeight;
    };

    Graphics.prototype.update = function(drawTick) {
      var dx, dy;
      dx = (this.newx - this.oldx) / C.ticksPerSimulation;
      dy = (this.newy - this.oldy) / C.ticksPerSimulation;
      this.graphics.x = this.oldx + dx * drawTick;
      return this.graphics.y = this.oldy + dy * drawTick;
    };

    return Graphics;

  })();

  vehicles = null;

  graphics = null;

  cells = null;

  renderer = null;

  stage = null;

  move = function(vehicle) {
    var gap, v;
    v = vehicle.speed;
    if (v < vehicle.maxSpeed) {
      v = v + 1;
    }
    if (Math.random() < C.pSlow) {
      v = v - 1;
    }
    gap = getGap(vehicle);
    if (v > gap) {
      v = gap;
    }
    if (v < 3) {
      v = 3;
    }
    vehicle.cell = inc(vehicle.cell, v);
    return vehicle.speed = v;
  };

  laneChange = function(vehicle) {
    var gap, lbgap, lbv, lfgap, rbgap, rbv, rfgap;
    if (vehicle.lane < C.numLanes - 1) {
      gap = getGap(vehicle);
      lfgap = getLeftFrontGap(vehicle);
      lbgap = getLeftBehindGap(vehicle);
      lbv = getBehindVehicle(vehicle.lane + 1, vehicle.cell);
      if (lbv == null) {
        lbv = 0;
      }
      if (gap < vehicle.maxSpeed && gap < lfgap && lbgap > lbv) {
        return +1;
      }
    }
    if (vehicle.lane > 0) {
      rfgap = getRightFrontGap(vehicle);
      rbgap = getRightBehindGap(vehicle);
      rbv = getBehindVehicle(vehicle.lane - 1, vehicle.cell);
      if (rbv == null) {
        rbv = 0;
      }
      if (rfgap > vehicle.speed && rbgap > rbv) {
        return -1;
      }
    }
    return 0;
  };

  simulate = function() {
    var i, laneChanges, newv, now, old, v, _i, _j, _len, _ref;
    newv = clone(vehicles);
    for (_i = 0, _len = newv.length; _i < _len; _i++) {
      v = newv[_i];
      move(v);
    }
    laneChanges = (function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = vehicles.length; _j < _len1; _j++) {
        v = vehicles[_j];
        _results.push(laneChange(v));
      }
      return _results;
    })();
    for (i = _j = 0, _ref = C.numVehicles - 1; 0 <= _ref ? _j <= _ref : _j >= _ref; i = 0 <= _ref ? ++_j : --_j) {
      now = newv[i];
      now.lane += laneChanges[i];
      old = vehicles[i];
      cells[old.lane][old.cell] = null;
      cells[now.lane][now.cell] = now;
    }
    return vehicles = newv;
  };

  getFrontVehicle = function(lane, cell) {
    var j, step;
    j = cell;
    step = 0;
    while (step < C.sightCells && j < C.numCells && !cells[lane][j]) {
      ++step;
      ++j;
    }
    return cells[lane][j];
  };

  getBehindVehicle = function(lane, cell) {
    var j, step;
    j = cell;
    step = 0;
    while (step < C.sightCells && j >= 0 && !cells[lane][j]) {
      ++step;
      --j;
    }
    return cells[lane][j];
  };

  getGap = function(vehicle) {
    var v;
    v = getFrontVehicle(vehicle.lane, vehicle.cell + vehicle.size);
    if (v) {
      return v.cell - vehicle.cell - vehicle.size;
    } else {
      return Infinity;
    }
  };

  getLeftFrontGap = function(vehicle) {
    var v;
    v = getFrontVehicle(vehicle.lane + 1, vehicle.cell);
    if (v) {
      return v.cell - vehicle.cell - vehicle.size;
    } else {
      return Infinity;
    }
  };

  getRightFrontGap = function(vehicle) {
    var v;
    v = getFrontVehicle(vehicle.lane - 1, vehicle.cell);
    if (v) {
      return v.cell - vehicle.cell - vehicle.size;
    } else {
      return Infinity;
    }
  };

  getLeftBehindGap = function(vehicle) {
    var v;
    v = getBehindVehicle(vehicle.lane + 1, vehicle.cell);
    if (v) {
      return vehicle.cell - v.cell - v.size;
    } else {
      return Infinity;
    }
  };

  getRightBehindGap = function(vehicle) {
    var v;
    v = getBehindVehicle(vehicle.lane - 1, vehicle.cell);
    if (v) {
      return vehicle.cell - v.cell - v.size;
    } else {
      return Infinity;
    }
  };

  random = function(hi) {
    return Math.floor(Math.random() * hi);
  };

  inc = function(x, y) {
    if (y == null) {
      y = 1;
    }
    if (x + y < C.numCells) {
      return x + y;
    } else {
      return x + y - C.numCells;
    }
  };

  dec = function(x, y) {
    if (y == null) {
      y = 1;
    }
    if (x - y >= 0) {
      return x - y;
    } else {
      return x - y + C.numCells;
    }
  };

  drawRoad = function() {
    var dashInterval, g, lane, road_renderer, road_stage, row, x, y, _i, _j, _k, _ref, _ref1, _ref2, _ref3;
    road_renderer = new PIXI.autoDetectRenderer(C.width, C.height);
    road_stage = new PIXI.Container();
    road_renderer.backgroundColor = 0xFFFFFF;
    document.getElementById('road').appendChild(road_renderer.view);
    g = new PIXI.Graphics();
    dashInterval = C.pxCellWidth;
    for (row = _i = 0, _ref = C.numRows - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; row = 0 <= _ref ? ++_i : --_i) {
      g.lineStyle(2, 0x000000, 1);
      g.drawRect(0, row * (C.rowHeight + C.rowMargin), C.width, C.rowHeight);
      g.endFill();
      y = row * (C.rowHeight + C.rowMargin);
      for (lane = _j = 0, _ref1 = C.numLanes - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; lane = 0 <= _ref1 ? ++_j : --_j) {
        g.lineStyle(1, 0x000000, 1);
        for (x = _k = 0, _ref2 = C.width - dashInterval, _ref3 = dashInterval * 2; _ref3 > 0 ? _k <= _ref2 : _k >= _ref2; x = _k += _ref3) {
          g.moveTo(x, y);
          g.lineTo(x + dashInterval, y);
        }
        g.endFill();
        y += C.pxCellHeight;
      }
    }
    road_stage.addChild(g);
    return road_renderer.render(road_stage);
  };

  init = function() {
    var g, i, j, l, now, rand, step, t, v, x, y, y2, _i, _j, _k, _ref, _ref1, _ref2;
    vehicles = [];
    graphics = [];
    cells = [];
    renderer = new PIXI.autoDetectRenderer(C.width, C.height, {
      transparent: true
    });
    stage = new PIXI.Container();
    document.getElementById('vehicle').appendChild(renderer.view);
    for (i = _i = 0, _ref = C.numLanes - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
      cells.push([]);
      for (j = _j = 0, _ref1 = C.numCells - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
        cells[i].push(null);
      }
    }
    for (i = _k = 0, _ref2 = C.numVehicles - 1; 0 <= _ref2 ? _k <= _ref2 : _k >= _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
      x = y = v = t = now = null;
      while (true) {
        x = random(C.numLanes);
        y = random(C.numCells);
        rand = Math.random();
        if (rand < .1) {
          t = "truck";
        } else if (rand < .4) {
          t = "bus";
        } else {
          t = "car";
        }
        v = random(C.vehicles[t].maxSpeed - 2);
        l = C.vehicles[t].size;
        y2 = y;
        step = 0;
        while (step < l && !cells[x][y2]) {
          ++step;
          y2 = inc(y2);
        }
        if (step === l) {
          break;
        }
      }
      switch (t) {
        case "car":
          now = new Car(x, y, v);
          break;
        case "bus":
          now = new Bus(x, y, v);
          break;
        case "truck":
          now = new Truck(x, y, v);
      }
      vehicles.push(now);
      cells[x][y] = now;
      g = new Graphics(x, y, C.vehicles[t].color, now.size);
      graphics.push(g);
      stage.addChild(g.graphics);
    }
    drawRoad();
    return draw();
  };

  drawTick = 0;

  window.draw = function() {
    var g, i, v, _i, _j, _len, _ref;
    requestAnimationFrame(draw);
    ++drawTick;
    if (drawTick === C.ticksPerSimulation) {
      drawTick = 0;
      simulate();
      for (i = _i = 0, _ref = C.numVehicles - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        v = vehicles[i];
        g = graphics[i];
        g.setNewPosition(v.lane, v.cell);
      }
    }
    for (_j = 0, _len = graphics.length; _j < _len; _j++) {
      g = graphics[_j];
      g.update(drawTick);
    }
    return renderer.render(stage);
  };

  clone = function(obj) {
    var key, temp;
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    temp = new obj.constructor();
    for (key in obj) {
      temp[key] = clone(obj[key]);
    }
    return temp;
  };

  init();

}).call(this);
