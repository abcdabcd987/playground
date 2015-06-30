//--- constants
var EPS = 1e-8;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
//var NUM_ATOMS = Math.min(~~(WIDTH * HEIGHT * 0.00047), 700);
var NUM_ATOMS = 1000;
var AVERAGE_VEL = 0.017;
//var RADIUS = ~~(Math.sqrt(0.05*WIDTH*HEIGHT/(NUM_ATOMS*Math.PI)));
var RADIUS = 3;
//var COLOR_SET = ['yellow', 'orange', 'green', 'blue', 'purple', 'red', 'pink'];
var COLOR_SET = [0x94DB6C, 0xFFDC60, 0xDE5424, 0x7F2350, 0x110747];
var COLOR_CHANGE_MOD = ~~(NUM_ATOMS*NUM_ATOMS*0.024);
var VEL_CHART_CNT = 50;

//--- Vector
function Vector(x, y) {
    this.x = x;
    this.y = y;
}

function V(x, y) {
    return new Vector(x, y);
}

Vector.prototype.add = function (rhs) {
    return V(this.x + rhs.x, this.y + rhs.y);
}

Vector.prototype.del = function (rhs) {
    return V(this.x - rhs.x, this.y - rhs.y);
}

Vector.prototype.mul = function (k) {
    return V(this.x * k, this.y * k);
}

Vector.prototype.dot = function (rhs) {
    return this.x * rhs.x + this.y * rhs.y;
}

Vector.prototype.len = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
}

//--- computational geometry
function dist(r1, r2) {
    return r1.del(r2).len();
}

//--- Heap
function Heap(size) {
    this.size = size;
    this._data = [null];
    this._position = [];
    for (var i = 0; i < size; ++i) {
        this._data.push(new HeapNode(i, Infinity));
        this._position.push(i+1);
    }
}

function HeapNode(key, value) {
    this.key = key;
    this.value = value;
}

HeapNode.prototype.swap = function(rhs) {
    var t = this.key; this.key = rhs.key; rhs.key = t;
    t = this.value; this.value = rhs.value; rhs.value = t;
}

Heap.prototype.reset = function() {
    for (var i = 1; i <= this.size; ++i) {
        this._data[i].value = Infinity;
    }
}

Heap.prototype._swap = function(idx1, idx2) {
    this._data[idx1].swap(this._data[idx2]);
    this._position[this._data[idx1].key] = idx1;
    this._position[this._data[idx2].key] = idx2;
}

Heap.prototype._up = function(i) {
    while (i > 1 && this._data[i].value < this._data[i>>1].value) {
        this._swap(i, i>>1);
        i >>= 1;
    }
}

Heap.prototype._down = function(i) {
    while ((i<<1) <= this.size) {
        var k = i;
        if (this._data[i<<1].value < this._data[k].value) k = i<<1;  
        if ((i<<1|1) <= this.size && this._data[i<<1|1].value < this._data[k].value) k = i<<1|1;
        if (k == i) break;
        this._swap(i, k);
        i = k;
    }
}

Heap.prototype.modify = function(key, value) {
    var i = this._position[key];
    var v = this._data[i].value;
    this._data[i].value = value;
    if (value < v) this._up(i);
    if (value > v) this._down(i);
}

Heap.prototype.top = function() {
    return this._data[1];
}

//--- Atom
function Collision() {
    this.id2 = null;
    this.time = Infinity;
    this.queue = new Heap(NUM_ATOMS+4);    
}

Collision.prototype.reset = function() {
    this.id2 = null;
    this.time = Infinity;
    this.queue.reset();
}

Collision.prototype.update = function(newtime, id2) {
    this.queue.modify(id2, newtime);
    var top = this.queue.top();
    this.time = top.value;
    this.id2 = top.key;
}

function Atom(id, pos, vel) {
    this.id = id;
    this.pos = pos;
    this.vel = vel;
    this.entity = new PIXI.Graphics();
    this.collision = new Collision();
    this.set_color(0x000000);
}

Atom.prototype.set_color = function (color) {
    //this.color = parseInt(color.substr(1), 16);
    this.color = color;
    this.entity.clear();
    this.entity.beginFill(this.color, 1);
    this.entity.drawCircle(0, 0, RADIUS);
    this.entity.endFill();
}

Atom.prototype.get_pos = function (t) {
    var x = this.pos.x + t * this.vel.x;
    var y = this.pos.y + t * this.vel.y;
    return V(x, y);
}

var initTime = null;
function now() {
    return (new Date()).getTime() - initTime;
}

var renderer = new PIXI.autoDetectRenderer(WIDTH, HEIGHT);
var stage = new PIXI.Container();
renderer.backgroundColor = 0xFFFFFF;
document.getElementById('canvas').appendChild(renderer.view);

//--- variables
var base_time = 0;
var max_speed = 0;
var vel_cnt = [];
var atoms = [];
var running = false;
var next_collision = {
    id1: null,
    id2: null,
    time: Infinity,
    update: function (atom) {
        if (atom.collision.time < next_collision.time) {
            next_collision.id1 = atom.id;
            next_collision.id2 = atom.collision.id2;
            next_collision.time = atom.collision.time;
        }
    }
};

//--- init atoms
function reset() {
    running = false;
    max_speed = 0;
    vel_cnt = [];
    atoms = [];
    stage.removeChildren();
    next_collision.time = Infinity;
    initTime = (new Date()).getTime();
}
function run() {
    for (var i = 0; i < VEL_CHART_CNT; ++i) vel_cnt.push(0);
    for (var i = 0; i < NUM_ATOMS; ++i) {
        stage.addChild(atoms[i].entity);
        calc_collision(i);
    }
    atoms.forEach(function (atom) {
        next_collision.update(atom);
    });
    running = true;
}
function init_random() {
    reset();
    for (var i = 0; i < NUM_ATOMS; ++i) {
        while (true) {
            var x = RADIUS + Math.random() * (WIDTH - 2*RADIUS);
            var y = RADIUS + Math.random() * (HEIGHT - 2*RADIUS);
            var pos = V(x, y);
            var flag = true;
            for (var j = 0; j < i && flag; ++j) {
                var len = atoms[j].pos.del(pos).len();
                flag = len > 2*RADIUS;
            }
            if (flag) break;
        }
        var vel = AVERAGE_VEL + (Math.random()-0.5)/10;
        var theta = Math.random() * 2*Math.PI;
        var vx = vel * Math.cos(theta);
        var vy = vel * Math.sin(theta);
        var atom = new Atom(i, pos, V(vx, vy));
        atoms.push(atom);
    }
    run();
}

//--- collision

function calc_pair_collision(i, j) {
    if (i == j) return;
    ++collision_cnt.pair;
    var a = atoms[i];
    var apos = a.get_pos(base_time);
    if (j < NUM_ATOMS) {
        var b = atoms[j];
        var bpos = b.get_pos(base_time);

        var p = apos.x - bpos.x;
        var n = apos.y - bpos.y;
        var q = a.vel.x - b.vel.x;
        var m = a.vel.y - b.vel.y;
        var A = q*q + m*m;
        var B = 2*(p*q + n*m);
        var C = p*p + n*n - 4*RADIUS*RADIUS;
        var D = B*B - 4*A*C;
        if (D < EPS) return;
        var t = (-B - Math.sqrt(D)) / (2 * A) + base_time;
        if (t > base_time) {
            a.collision.update(t, j);
            b.collision.update(t, i);
        }
    } else if (j == NUM_ATOMS) {
        var t_wall = (WIDTH - RADIUS - apos.x) / a.vel.x + base_time;
        if (t_wall > base_time + EPS) a.collision.update(t_wall, NUM_ATOMS);
    } else if (j == NUM_ATOMS+1) {
        var t_wall = (apos.y - RADIUS) / (-a.vel.y) + base_time;
        if (t_wall > base_time + EPS) a.collision.update(t_wall, NUM_ATOMS+1);
    } else if (j == NUM_ATOMS+2) {
        var t_wall = (apos.x - RADIUS) / (-a.vel.x) + base_time;
        if (t_wall > base_time + EPS) a.collision.update(t_wall, NUM_ATOMS+2);
    } else if (j == NUM_ATOMS+3) {
        var t_wall = (HEIGHT - RADIUS - apos.y) / a.vel.y + base_time;
        if (t_wall > base_time + EPS) a.collision.update(t_wall, NUM_ATOMS+3);
    }
}

function calc_collision(i) {
    if (i >= NUM_ATOMS) return;
    ++collision_cnt.atom;
    atoms.forEach(function(atom) {
        atom.collision.update(Infinity, i);
    })
    atoms[i].collision.reset();
    for (var j = 0; j < NUM_ATOMS+4; ++j)
        calc_pair_collision(i, j);
}

function update_next_collision() {
    if (!running) return;
    
    calc_collision(next_collision.id1);
    calc_collision(next_collision.id2);

    next_collision.time = Infinity;
    atoms.forEach(function (atom) {
        next_collision.update(atom);
    });
}

function generate_color(vel) {
    var speed = vel.len();
    var block = ~~Math.floor(speed/max_speed * COLOR_SET.length);
    if (block == COLOR_SET.length) --block;
    //return randomColor({hue: COLOR_SET[block], luminosity: 'light'});
    return COLOR_SET[block];
}

function update_atom() {
    if (!running) return;
    ++collision_cnt.collision;
    var next_time = next_collision.time;
    var a = atoms[next_collision.id1];
    var block = get_speed_block(a);
    if (block < vel_cnt.length)
        --vel_cnt[get_speed_block(a)];
    switch (next_collision.id2) {
        case NUM_ATOMS:
        case NUM_ATOMS+2:
            a.pos = a.get_pos(next_time);
            a.vel.x *= -1;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            break;

        case NUM_ATOMS+1:
        case NUM_ATOMS+3:
            a.pos = a.get_pos(next_time);
            a.vel.y *= -1;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            break;

        default:
            var b = atoms[next_collision.id2];
            block = get_speed_block(b);
            if (block < vel_cnt.length)
                --vel_cnt[block];
            var apos = a.get_pos(base_time);
            var bpos = b.get_pos(base_time);
            var d = dist(apos, bpos);
            var k = a.vel.del(b.vel).dot(apos.del(bpos)) / (d*d);
            var v1 = a.vel.del(apos.del(bpos).mul(k));
            var v2 = b.vel.del(bpos.del(apos).mul(k));
            a.pos = a.get_pos(next_time);
            b.pos = b.get_pos(next_time);
            a.vel = v1;
            b.vel = v2;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            b.pos = b.vel.mul(-next_time).add(b.pos);
            b.set_color(generate_color(b.vel));

            block = get_speed_block(b);
            if (block < vel_cnt.length)
                ++vel_cnt[block];
    }

    block = get_speed_block(a);
    if (block < vel_cnt.length)
        ++vel_cnt[block];
    a.set_color(generate_color(a.vel));
    base_time = next_time;
}

//--- draw
function draw() {
    var time = now();
    atoms.forEach(function(atom) {
        var pos = atom.get_pos(time);
        atom.entity.x = pos.x;
        atom.entity.y = pos.y;
    });

    requestAnimationFrame(draw);
    renderer.render(stage);
}

function calc() {
    var time = now();
    while (time > next_collision.time) {
        update_atom();
        update_next_collision();
    }
    setTimeout(calc, 15);
}

function get_speed_block(atom) {
    var speed = atom.vel.len();
    return ~~Math.floor(speed / max_speed * VEL_CHART_CNT);
}

function calc_vel_cnt() {
    for (var i = 0; i < vel_cnt.length; ++i) vel_cnt[i] = 0;
    atoms.forEach(function (atom) {
        var block = get_speed_block(atom);
        if (block < vel_cnt.length) {
            ++vel_cnt[block];
        }
    });
}

function update_speed() {
    max_speed = 0;
    atoms.forEach(function (atom) {
        max_speed = Math.max(max_speed, atom.vel.len());
    });
    calc_vel_cnt();
    setTimeout(update_speed, 3000);
}

function update_chart() {
    var cnt = ['speed'];
    for (var i = 0; i < vel_cnt.length; ++i)
        cnt.push(vel_cnt[i] / NUM_ATOMS);
    var chart = c3.generate({
        bindto: '#chart',
        data: {
            columns: [cnt],
            types: {speed: 'area-step'}
        },
        legend: { show: false },
        size: { width: 200, height: 120 },
        transition: { duration: 0 },
        axis: {
            y: {
                max: 0.1,
                min: 0,
                tick: {values: []},
                label: "% atoms",
                padding: {top: 0, bottom: 0, left:0, right:0}
            },
            x: {
                tick: {values: []},
                label: "speed"
            },
        }
    })
    setTimeout(update_chart, 200);
}

var collision_cnt = { collision: 0, atom: 0, pair: 0};
function stat_collision() {
    console.log('In 1 second: %d collisions, %d atoms updated, %d pair calculations', collision_cnt.collision, collision_cnt.atom, collision_cnt.pair);
    collision_cnt = { collision: 0, atom: 0, pair: 0};
    setTimeout(stat_collision, 1000);
}

calc();
update_speed();
update_chart();
stat_collision();
draw();
