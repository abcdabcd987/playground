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
function Atom(pos, vel, mass) {
    this.pos = pos;
    this.vel = vel;
    this.mass = mass;
    this.color = '#000000';
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

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//--- constants
var EPS = 1e-8;
var WIDTH = canvas.width;
var HEIGHT = canvas.height;
var NUM_ATOMS = Math.min(~~(WIDTH * HEIGHT * 0.00177), 700);
var AVERAGE_VEL = 0.007;
var RADIUS = ~~(Math.sqrt(0.05*WIDTH*HEIGHT/(NUM_ATOMS*Math.PI)));
var COLOR_CHANGE_MOD = ~~(NUM_ATOMS*NUM_ATOMS*0.024);

//--- variables
var base_time = 0;
var cnt_collision = 0;
var color_set_id = 0;
var max_speed = 0;

//--- init atoms
var atoms = [];
function init() {
    var offset = 0;
    var color = 'red';
    var mass = 1;
    for (var i = 0; i < NUM_ATOMS; ++i) {
        if (i >= NUM_ATOMS/2) {
            offset = HEIGHT/2;
            color = 'green';
            mass = 0.1;
        }
        while (true) {
            var x = RADIUS + Math.random() * (WIDTH - 2*RADIUS);
            var y = offset + RADIUS + Math.random() * (HEIGHT/2 - 2*RADIUS);
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
        var atom = new Atom(pos, V(vx, vy), mass);
        atom.color = randomColor({hue: color, luminosity: 'dark'});
        atoms.push(atom);
    }
    for (var i = 0; i < NUM_ATOMS+4; ++i) {
        collisions.push(new Collision(i));
    }

    initTime = (new Date()).getTime();
    for (var i = 0; i < NUM_ATOMS; ++i) {
        calc_collision(i);
        if (collisions[i].time < next_collision.time) {
            next_collision.copy(collisions[i]);
        }
    }
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
        var C = p*p + n*n - 4*RADIUS*RADIUS;
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
        var t_wall = (WIDTH - RADIUS - apos.x) / a.vel.x + base_time;
        collisions[NUM_ATOMS].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS);
    }
    if (a.vel.y < 0) {
        var t_wall = (apos.y - RADIUS) / (-a.vel.y) + base_time;
        collisions[NUM_ATOMS+1].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS+1);
    }
    if (a.vel.x < 0) {
        var t_wall = (apos.x - RADIUS) / (-a.vel.x) + base_time;
        collisions[NUM_ATOMS+2].update(t_wall, i);
        collision.update(t_wall, NUM_ATOMS+2);
    }
    if (a.vel.y > 0) {
        var t_wall = (HEIGHT - RADIUS - apos.y) / a.vel.y + base_time;
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

function update_atom() {
    var next_time = next_collision.time;
    var a = atoms[next_collision.id1];
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
            var apos = a.get_pos(base_time);
            var bpos = b.get_pos(base_time);
            var d = dist(apos, bpos);
            var k = a.vel.del(b.vel).dot(apos.del(bpos)) / (d*d);
            var v1 = a.vel.del(apos.del(bpos).mul(k * 2*b.mass/(a.mass+b.mass)));
            var v2 = b.vel.del(bpos.del(apos).mul(k * 2*a.mass/(a.mass+b.mass)));
            a.pos = a.get_pos(next_time);
            b.pos = b.get_pos(next_time);
            a.vel = v1;
            b.vel = v2;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            b.pos = b.vel.mul(-next_time).add(b.pos);
    }

    base_time = next_time;
}

//--- draw
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    var time = now();
    atoms.forEach(function(atom) {
        ctx.beginPath();
        var pos = atom.get_pos(time);
        ctx.arc(pos.x, pos.y, RADIUS, 0, 2*Math.PI);
        ctx.fillStyle = atom.color;
        ctx.fill();
        ctx.closePath();
    });
    setTimeout(draw, 16);
}

function calc() {
    var time = now();
    while (time > next_collision.time) {
        update_atom();
        update_next_collision();
    }
    setTimeout(calc, 15);
}

init();
calc();
draw();
