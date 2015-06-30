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

//--- Atom
function Atom(pos, vel, radius) {
    this.pos = pos;
    this.vel = vel;
    this.initpos = pos;
    this.radius = radius;
    this.mass = 1;
    this.entity = new PIXI.Graphics();
    this.set_color(0x000000);
}

Atom.prototype.set_color = function (color) {
    //this.color = parseInt(color.substr(1), 16);
    this.color = color;
    this.entity.clear();
    this.entity.beginFill(this.color, 1);
    this.entity.drawCircle(0, 0, this.radius);
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

var renderer = new PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);
var stage = new PIXI.Container();
renderer.backgroundColor = 0xFFFFFF;
document.getElementById('canvas').appendChild(renderer.view);

var path_renderer = new PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {transparent: true});
var path_stage = new PIXI.Container();
var path_last_point = null;
document.getElementById('path').appendChild(path_renderer.view);
var path_graphics = new PIXI.Graphics();
stage.addChild(path_graphics);

//--- constants
var EPS = 1e-8;
var WIDTH = renderer.width;
var HEIGHT = renderer.height;
var NUM_ATOMS = Math.min(~~(WIDTH * HEIGHT * 0.00147), 1000);
//var NUM_ATOMS = 1000;
var AVERAGE_VEL = 0.057;
var RADIUS = ~~(Math.sqrt(0.05*WIDTH*HEIGHT/(NUM_ATOMS*Math.PI)));
//var RADIUS = 5;
//var COLOR_SET = ['yellow', 'orange', 'green', 'blue', 'purple', 'red', 'pink'];
var COLOR_SET = [0x94DB6C, 0xFFDC60, 0xDE5424, 0x7F2350, 0x110747];
var VEL_CHART_CNT = 50;

//--- variables
var base_time = 0;
var color_set_id = 0;
var max_speed = 0;
var vel_cnt = [];

//--- init atoms
var atoms = [];
function init() {
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
        var atom = new Atom(pos, V(vx, vy), RADIUS);
        atoms.push(atom);
        stage.addChild(atom.entity);
    }

    atoms[0].radius = RADIUS*3;
    atoms[0].mass = 27;
    atoms[0].set_color(0xFF0000);
    path_last_point = atoms[0].pos;

    for (var i = 0; i < NUM_ATOMS+4; ++i) {
        collisions.push(new Collision(i));
    }

    for (var i = 0; i < VEL_CHART_CNT; ++i) vel_cnt.push(0);

    initTime = (new Date()).getTime();
    for (var i = 0; i < NUM_ATOMS; ++i) {
        calc_collision(i);
        if (collisions[i].time < next_collision.time) {
            next_collision.copy(collisions[i]);
        }
    }
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

//--- collision
function Collision(id) {
    this.id1 = id;
    this.id2 = null;
    this.time = Infinity;
}

Collision.prototype.update = function(newtime, id2) {
    if (newtime < this.time) {
        this.time = newtime;
        this.id2 = id2;
    }
}

Collision.prototype.copy = function(rhs) {
    this.id1 = rhs.id1;
    this.id2 = rhs.id2;
    this.time = rhs.time;
}

var collisions = [];
var next_collision = new Collision();

function calc_collision(i) {
    var a = atoms[i];
    var apos = a.get_pos(base_time);
    var collision = collisions[i];

    // atom collision
    for (var j = 0; j < atoms.length; ++j) {
        if (j == i) continue;
        var b = atoms[j];
        var bpos = b.get_pos(base_time);

        var p = apos.x - bpos.x;
        var n = apos.y - bpos.y;
        var q = a.vel.x - b.vel.x;
        var m = a.vel.y - b.vel.y;
        var A = q*q + m*m;
        var B = 2*(p*q + n*m);
        var C = p*p + n*n - 4*a.radius*b.radius;
        var D = B*B - 4*A*C;
        if (D < EPS) continue;
        var t = (-B - Math.sqrt(D)) / (2 * A) + base_time;
        if (t > base_time) {
            collisions[j].update(t, i);
            collision.update(t, j)
        }
    }

    // wall collision
    if (a.vel.x > 0) {
        var t_wall = (WIDTH - a.radius - apos.x) / a.vel.x + base_time;
        collisions[NUM_ATOMS].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS);
    }
    if (a.vel.y < 0) {
        var t_wall = (apos.y - a.radius) / (-a.vel.y) + base_time;
        collisions[NUM_ATOMS+1].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS+1);
    }
    if (a.vel.x < 0) {
        var t_wall = (apos.x - a.radius) / (-a.vel.x) + base_time;
        collisions[NUM_ATOMS+2].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS+2);
    }
    if (a.vel.y > 0) {
        var t_wall = (HEIGHT - a.radius - apos.y) / a.vel.y + base_time;
        collisions[NUM_ATOMS+3].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS+3);
    }
}

function update_next_collision() {
    var update_list = [];
    for (var i = 0; i < NUM_ATOMS+4; ++i) {
        var c = collisions[i];
        if (c.id2 == next_collision.id1 || c.id2 == next_collision.id2) {
            update_list.push(i);
            c.time = Infinity;
        }
    }
    for (var i = 0; i < update_list.length; ++i) {
        var id = update_list[i];
        if (id < NUM_ATOMS) {
            calc_collision(id);
        }
    }
    next_collision.time = Infinity;
    for (var i = 0; i < NUM_ATOMS; ++i) {
        if (collisions[i].time < next_collision.time) {
            next_collision.copy(collisions[i]);
        }
    }
}

function generate_color(vel) {
    var speed = vel.len();
    var block = ~~Math.floor(speed/max_speed * COLOR_SET.length);
    if (block == COLOR_SET.length) --block;
    //return randomColor({hue: COLOR_SET[block], luminosity: 'light'});
    return COLOR_SET[block];
}

function update_atom() {
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
            var v1 = a.vel.del(apos.del(bpos).mul(k*2*b.mass/(a.mass+b.mass)));
            var v2 = b.vel.del(bpos.del(apos).mul(k*2*a.mass/(a.mass+b.mass)));
            a.pos = a.get_pos(next_time);
            b.pos = b.get_pos(next_time);
            a.vel = v1;
            b.vel = v2;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            b.pos = b.vel.mul(-next_time).add(b.pos);

            block = get_speed_block(b);
            if (block < vel_cnt.length)
                ++vel_cnt[get_speed_block(b)];
    }

    block = get_speed_block(a);
    if (block < vel_cnt.length)
        ++vel_cnt[get_speed_block(a)];
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

    path_graphics.moveTo(path_last_point.x, path_last_point.y);
    path_last_point = atoms[0].get_pos(time);
    path_graphics.lineStyle(1, 0xFF0000, 1);
    path_graphics.lineTo(path_last_point.x, path_last_point.y);
    path_graphics.endFill();

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

function update_speed() {
    max_speed = 0;
    atoms.forEach(function (atom) {
        max_speed = Math.max(max_speed, atom.vel.len());
    });
    calc_vel_cnt();
    setTimeout(update_speed, 3000);
}

var path_lengths = ['<R^2>'];

function update_chart() {
    var cnt = ['speed'];
    for (var i = 0; i < vel_cnt.length; ++i)
        cnt.push(vel_cnt[i] / NUM_ATOMS);
    var chart = c3.generate({
        bindto: '#chart',
        data: {
            columns: [
                cnt
            ],
            types: {
                speed: 'area-step'
            }
        },
        legend: {
            show: false
        },
        size: {
            width: 200,
            height: 120
        },
        transition: {
            duration: 0
        },
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

    var meanr2 = 0;
    var meanEk = 0;
    var time = now();
    atoms.forEach(function (atom) {
        var pos = atom.get_pos(time);
        var d = pos.del(atom.initpos);
        meanr2 += d.x*d.x + d.y*d.y;
        var v = atom.vel;
        meanEk += 1/2 * atom.mass * (v.x*v.x + v.y*v.y);
    });
    var bigEk = 1/2 * atoms[0].mass * Math.pow(atoms[0].vel.len(), 2);
    meanEk = (meanEk-bigEk) / (atoms.length-1);
    meanr2 /= atoms.length;
    path_lengths.push(meanr2);

    var chart2 = c3.generate({
        bindto: '#chart2',
        data: {
            columns: [
                path_lengths
            ]
        },
        legend: {
            show: false
        },
        size: {
            width: 200,
            height: 120
        },
        transition: {
            duration: 0
        },
        tooltip: {
            show: false
        },
        point: {
            show: false
        },
        axis: {
            y: {
                label: "<R^2>",
                padding: {top: 0, bottom: 0, left:0, right:0}
                tick: {count:4}
            },
            x: {
                tick: {values: []},
                label: "t"
            },
        }
    })

    bigEk *= 1000;
    meanEk *= 1000;
    document.getElementById('bigek').innerHTML = bigEk.toFixed(3);
    document.getElementById('meanek').innerHTML = meanEk.toFixed(3);

    setTimeout(update_chart, 200);
}

init();
calc();
update_speed();
update_chart();
draw();
