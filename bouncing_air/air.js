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

function solver(a, b) {
    // a[0][0] x + a[0][1] y == b[0]
    // a[1][0] x + a[1][1] y == b[1]
    var d = a[0][1] * a[1][0] - a[0][0] * a[1][1];
    if (Math.abs(d) < EPS) return null;
    var x = b[1] * a[0][1] - b[0] * a[1][1];
    var y = -b[1] * a[0][0] + b[0] * a[1][0];
    return {x: x/d, y: y/d};
}

function intersection_point(r1, v1, r2, v2) {
    // (x1, y1) + λ (Vx1, Vy1) == (x2, y2) + μ (Vx2, Vy2)
    // Vx1 λ - Vx2 μ == x2 - x1
    // Vy1 λ - Vy2 μ == y2 - y1
    var a11 = v1.x;
    var a12 = -v2.x;
    var a21 = v1.y;
    var a22 = -v2.y;
    var b1 = r2.x - r1.x;
    var b2 = r2.y - r1.y;

    var ans = solver([[a11, a12], [a21, a22]], [b1, b2]);
    if (ans === null) return null;
    var lambda = ans.x;
    var mu = ans.y;
    if (lambda < -EPS || mu < -EPS) return null;
    return v1.mul(lambda).add(r1);
}

//--- Atom
function Atom(pos, vel) {
    this.pos = pos;
    this.vel = vel;
    this.color = randomColor({hue: 'monochrome', luminosity: 'dark'});
}

Atom.prototype.get_pos = function (t) {
    var x = this.pos.x + t * this.vel.x;
    var y = this.pos.y + t * this.vel.y;
    return V(x, y);
}

var initTime = (new Date()).getTime();
function now() {
    return (new Date()).getTime() - initTime;
}

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = window.innerWidth-20;
canvas.height = window.innerHeight-20;

//--- constants
var NUM_ATOMS = 32;
var AVERAGE_VEL = 0.2;
var EPS = 1e-8;
var WIDTH = canvas.width;
var HEIGHT = canvas.height;
var RADIUS = 10;randomColor({hue: 'random'});
var COLOR_SET = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'monochrome'];
var COLOR_CHANGE_MOD = NUM_ATOMS*4;

//--- variables
var base_time = 0;
var cnt_collision = 0;
var color_set_id = 0;

//--- init atoms
var atoms = [];
for (var i = 0; i < NUM_ATOMS; ++i) {
    var x = RADIUS + Math.random() * (WIDTH - 2*RADIUS);
    var y = RADIUS + Math.random() * (HEIGHT - 2*RADIUS);
    var vel = AVERAGE_VEL + (Math.random()-0.5)/10;
    var theta = Math.random() * Math.PI * 2;
    var vx = vel * Math.cos(theta);
    var vy = vel * Math.sin(theta);
    atoms.push(new Atom(V(x, y), V(vx, vy)));
}
//atoms.push(new Atom(V(0,0), V(0.1, 0.1)));
//atoms.push(new Atom(V(100,0), V(-0.1, 0.1)));

//--- collision
var next_collision = {
    time: Infinity,
    id1: null,
    id2: null,
    update: function(newtime, id1, id2) {
        if (newtime < this.time) {
            this.time = newtime;
            this.id1 = id1;
            this.id2 = id2;
        }
    }
};

function calc_collision() {
    next_collision.time = Infinity;
    for (var i = 0; i < atoms.length; ++i) {
        var a = atoms[i];
        var apos = a.get_pos(base_time);

        // atom collision
        for (var j = i+1; j < atoms.length; ++j) {
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
                next_collision.update(t, i, j);
            }
        }

        // wall collision
        if (a.vel.x > 0) {
            var t_wall = (WIDTH - RADIUS - apos.x) / a.vel.x + base_time;
            next_collision.update(t_wall, i, -1);
        }
        if (a.vel.y < 0) {
            var t_wall = (apos.y - RADIUS) / (-a.vel.y) + base_time;
            next_collision.update(t_wall, i, -2);
        }
        if (a.vel.x < 0) {
            var t_wall = (apos.x - RADIUS) / (-a.vel.x) + base_time;
            next_collision.update(t_wall, i, -3)
        }
        if (a.vel.y > 0) {
            var t_wall = (HEIGHT - RADIUS - apos.y) / a.vel.y + base_time;
            next_collision.update(t_wall, i, -4);
        }
    }
}

function update_atom() {
    if (++cnt_collision % COLOR_CHANGE_MOD == 0) {
        color_set_id = (color_set_id + 1) % COLOR_SET.length;
    }
    var next_time = next_collision.time;
    var color = randomColor({hue: COLOR_SET[color_set_id], luminosity: 'dark'});
    var a = atoms[next_collision.id1];
    switch (next_collision.id2) {
        case -1:
        case -3:
            a.pos = a.get_pos(next_time);
            a.vel.x *= -1;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            break;

        case -2:
        case -4:
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
            var v1 = a.vel.del(apos.del(bpos).mul(k));
            var v2 = b.vel.del(bpos.del(apos).mul(k));
            a.pos = a.get_pos(next_time);
            b.pos = b.get_pos(next_time);
            a.vel = v1;
            b.vel = v2;
            a.pos = a.vel.mul(-next_time).add(a.pos);
            b.pos = b.vel.mul(-next_time).add(b.pos);
            b.color = color;
    }

    a.color = color;
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
    while (time > next_collision.time) {
        update_atom();
        calc_collision();
    }
    setTimeout(draw, 25);
}

calc_collision();
draw();
