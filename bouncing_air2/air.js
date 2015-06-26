//--- constants
var EPS = 1e-8;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
//var NUM_ATOMS = Math.min(~~(WIDTH * HEIGHT * 0.00047), 700);
var NUM_ATOMS = 10;
var AVERAGE_VEL = 3;
var RADIUS = 10;
//var RADIUS = ~~(Math.sqrt(0.05*WIDTH*HEIGHT/(NUM_ATOMS*Math.PI)));
var COLOR_SET = [0x94DB6C, 0xFFDC60, 0xDE5424, 0x7F2350, 0x110747];

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

Vector.prototype.theta = function(rhs) {
    return Math.acos(this.dot(rhs) / (this.len() * rhs.len()));
}

Vector.prototype.identity = function() {
    return this.mul(1/this.len());
}

//--- Line
function Line(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
}

//--- computational geometry
function dist(r1, r2) {
    function point_line(p, a, b) {
        var ap = p.del(a);
        var ab = b.del(a);
        var theta = ap.theta(ab);
        return ap.len() * Math.sin(theta);
    }
    if ((r1 instanceof Vector) && (r2 instanceof Vector))return r1.del(r2).len();
    if ((r1 instanceof Vector) && (r2 instanceof Line)) return point_line(r1, r2.p1, r2.p2);
    if ((r1 instanceof Line) && (r2 instanceof Vector)) return point_line(r2, r1.p1, r1.p2);
}

function solve_equations(a1, b1, c1, a2, b2, c2) {
    // a1 x + b1 y == c1
    // a2 x + b2 y == c2
    var d = a2*b1 - a1*b2;
    if (Math.abs(d) < EPS) return null;
    var a = b1*c2 - b2*c1;
    var b = a2*c1 - a1*c2;
    return {x: a/d, y: b/d};
}

function solve_vector_equations(a, b, c) {
    // a * x + b * y == c
    return solve_equations(a.x, b.x, c.x, a.y, b.y, c.y);
}

//--- Atom
function Atom(pos, vel, acc) {
    this.pos = pos;
    this.vel = vel;
    this.acc = acc;
    this.entity = new PIXI.Graphics();
    this.set_color(parseInt(randomColor().substr(1), 16));
}

Atom.prototype.update_position = function() {
    this.vel = this.vel.add(this.acc);
    this.pos = this.pos.add(this.vel);
    this.entity.x = this.pos.x;
    this.entity.y = this.pos.y;
}

Atom.prototype.set_color = function (color) {
    this.color = color;
    this.entity.clear();
    this.entity.beginFill(this.color, 1);
    this.entity.drawCircle(0, 0, RADIUS);
    this.entity.endFill();
}

//--- Wall
function Wall(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    this.entity = new PIXI.Graphics();
    this.entity.lineStyle(1, 0x000000, 1);
    this.entity.moveTo(p1.x, p1.y);
    this.entity.lineTo(p2.x, p2.y);
    this.entity.endFill();
}

Wall.prototype.update_position = function() {

}

//--- global
//var renderer = new PIXI.autoDetectRenderer(WIDTH, HEIGHT);
var renderer = new PIXI.autoDetectRenderer(WIDTH, HEIGHT, { antialias: true });
var stage = new PIXI.Container();
renderer.backgroundColor = 0xFFFFFF;
document.getElementById('canvas').appendChild(renderer.view);

//--- variables
var objs = [];

//--- atoms
function init() {
    for (var i = 0; i < NUM_ATOMS; ++i) {
        while (true) {
            var x = RADIUS + Math.random() * (WIDTH - 2*RADIUS);
            var y = RADIUS + Math.random() * (HEIGHT - 2*RADIUS);
            var pos = V(x, y);
            var flag = true;
            for (var j = 0; j < i && flag; ++j) {
                var len = objs[j].pos.del(pos).len();
                flag = len > 2*RADIUS;
            }
            if (flag) break;
        }
        var vel = AVERAGE_VEL + (Math.random()-0.5)/10;
        var theta = Math.random() * 2*Math.PI;
        var vx = vel * Math.cos(theta);
        var vy = vel * Math.sin(theta);
        //var ax = 0;
        //var ay = 0.1;
        var ax = 0; var ay = 0;
        var atom = new Atom(pos, V(vx, vy), V(ax, ay));
        objs.push(atom);
    }
    objs.push(new Wall(V(0, 0), V(WIDTH, 0)));
    objs.push(new Wall(V(0, HEIGHT), V(WIDTH, HEIGHT)));
    objs.push(new Wall(V(0, 0), V(0, HEIGHT)));
    objs.push(new Wall(V(WIDTH, 0), V(WIDTH, HEIGHT)));
    objs.push(new Wall(V(WIDTH/3, HEIGHT/4), V(WIDTH/5*4, HEIGHT/8*7)));
    objs.push(new Wall(V(WIDTH/5*4, HEIGHT/8*7), V(WIDTH/10*4, HEIGHT/30*27)));
    objs.push(new Wall(V(WIDTH/10*4, HEIGHT/30*27), V(WIDTH/10*2, HEIGHT/8*3)));
    objs.forEach(function(obj) { stage.addChild(obj.entity); });
}

//--- physics engine
function update_position() {
    objs.forEach(function(obj) {
        obj.update_position();
    });
}

function collide_atom_wall(atom, wall) {
    if (dist(atom.pos, new Line(wall.p1, wall.p2)) > RADIUS) return false;
    var k = solve_vector_equations(atom.vel, wall.p1.del(wall.p2), wall.p1.del(atom.pos));
    if (!k || k.x < 0 || k.y < 0 || k.y > 1) return false;

    var vwall = wall.p2.del(wall.p1);
    var vel = atom.vel;
    var crosslen = vwall.dot(vel)/vwall.len();
    var vcross = vwall.identity().mul(crosslen);
    var vinc = vcross.del(vel);
    atom.vel = vcross.add(vinc);
    return true;
}

function collide_atom_atom(a, b) {
    var apos = a.pos;
    var bpos = b.pos;
    var d = dist(apos, bpos);

    if (d > 2*RADIUS) return false;

    var k = a.vel.del(b.vel).dot(apos.del(bpos)) / (d*d);
    var v1 = a.vel.del(apos.del(bpos).mul(k));
    var v2 = b.vel.del(bpos.del(apos).mul(k));
    a.vel = v1;
    b.vel = v2;
    return true;
}

function collide(obj1, obj2) {
    if ((obj1 instanceof Wall) && (obj2 instanceof Wall)) return false;
    if ((obj1 instanceof Wall) && (obj2 instanceof Atom)) return collide_atom_wall(obj2, obj1);
    if ((obj1 instanceof Atom) && (obj2 instanceof Wall)) return collide_atom_wall(obj1, obj2);
    return collide_atom_atom(obj1, obj2);
}

function handle_collision() {
    for (var i = 0; i < objs.length; ++i) {
        for (var j = i+1; j < objs.length; ++j) {
            collide(objs[i], objs[j]);
        }
    }
}

//--- draw
function draw() {
    update_position();
    handle_collision();

    objs.forEach(function(obj) {
        obj.update_position();
    });

    renderer.render(stage);
    requestAnimationFrame(draw);
}

init();
draw();
