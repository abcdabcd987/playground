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
function Atom(pos, vel) {
    this.pos = pos;
    this.vel = vel;
    this.entity = new PIXI.Graphics();
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

//var RADIUS = ~~(Math.sqrt(0.05*WIDTH*HEIGHT/(NUM_ATOMS*Math.PI)));
var RADIUS = 2;

function AIR(DOM_name, AVERAGE_VEL, callback) {

    var initTime = null;
    function now() {
        return (new Date()).getTime() - initTime;
    }
    //--- constants
    var DOM = document.getElementById(DOM_name);
    var EPS = 1e-8;
    var WIDTH = DOM.clientWidth;
    var HEIGHT = DOM.clientHeight;
    var NUM_ATOMS = Math.min(~~(WIDTH * HEIGHT * 0.00247), 100);
    //var NUM_ATOMS = 100;
    //var COLOR_SET = ['yellow', 'orange', 'green', 'blue', 'purple', 'red', 'pink'];
    var COLOR_SET = [0x94DB6C, 0xFFDC60, 0xDE5424, 0x7F2350, 0x110747];
    var COLOR_CHANGE_MOD = ~~(NUM_ATOMS*NUM_ATOMS*0.024);
    var VEL_CHART_CNT = 50;

    //--- variables
    var base_time = 0;
    var max_speed = 0;
    var vel_cnt = [];
    var collisions = [];
    var next_collision = new Collision();
    var atoms = [];
    var running = false;
    var diff_momentum = 0;
    var mean_ek = 0;

    var renderer = new PIXI.autoDetectRenderer(WIDTH, HEIGHT);
    var stage = new PIXI.Container();
    renderer.backgroundColor = 0xFFFFFF;
    DOM.appendChild(renderer.view);

    //--- init atoms
    function reset() {
        running = false;
        max_speed = 0;
        mean_ek = 0;
        vel_cnt = [];
        atoms = [];
        collisions = [];
        stage.removeChildren();
        next_collision = new Collision();;
        initTime = (new Date()).getTime();
    }
    function run() {
        for (var i = 0; i < VEL_CHART_CNT; ++i) vel_cnt.push(0);
        for (var i = 0; i < NUM_ATOMS+4; ++i) {
            collisions.push(new Collision(i));
        }
        for (var i = 0; i < NUM_ATOMS; ++i) {
            stage.addChild(atoms[i].entity);
            calc_collision(i);
            if (collisions[i].time < next_collision.time) {
                next_collision.copy(collisions[i]);
            }
            var vel = atoms[i].vel;
            mean_ek += vel.x*vel.x + vel.y*vel.y;
        }
        mean_ek = mean_ek / 2 / NUM_ATOMS;
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
            var atom = new Atom(pos, V(vx, vy));
            atoms.push(atom);
        }
        run();
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
        if (!running) return;
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
        if (!running) return;
        var next_time = next_collision.time;
        var a = atoms[next_collision.id1];
        var block = get_speed_block(a);
        if (block < vel_cnt.length)
            --vel_cnt[get_speed_block(a)];
        switch (next_collision.id2) {
            case NUM_ATOMS:
                diff_momentum += a.vel.x*2;
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
        while (time > next_collision.time) {
            update_atom();
            update_next_collision();
        }
        atoms.forEach(function(atom) {
            var pos = atom.get_pos(time);
            atom.entity.x = pos.x;
            atom.entity.y = pos.y;
        });

        requestAnimationFrame(draw);
        renderer.render(stage);
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
        setTimeout(update_speed, 1000);
    }

    function stat_momentum() {
        var TIMEOUT = 200;
        callback(mean_ek, diff_momentum / TIMEOUT / HEIGHT);
        diff_momentum = 0;
        setTimeout(stat_momentum, TIMEOUT);
    }

    update_speed();
    init_random();
    stat_momentum();
    draw();
}

var mean_ek = ['<Ek>', 0];
var momentum = ['<p>', 0];
var stat_cnt = [null, 1];
for (var i = 0; i < 8; ++i) {
    mean_ek.push(0);
    momentum.push(0);
    stat_cnt.push(0);
}

function gen(i) {
    return function(e, m) {
        mean_ek[i] = e*10;
        momentum[i] += m*10000;
        ++stat_cnt[i];
    }
}

AIR('chart1', 0.025, gen(2));
AIR('chart2', 0.050, gen(3));
AIR('chart3', 0.075, gen(4));
AIR('chart4', 0.100, gen(5));
AIR('chart6', 0.125, gen(6));
AIR('chart7', 0.150, gen(7));
AIR('chart8', 0.175, gen(8));
AIR('chart9', 0.200, gen(9));

var CHART_WIDTH = document.getElementById('chart5').clientWidth*.95;
var CHART_HEIGHT = document.getElementById('chart5').clientHeight*.95;
function draw_stat_chart() {
    var m = ['<p>']
    for (var i = 1; i <= 9; ++i) m.push(momentum[i]/stat_cnt[i]);
    var chart2 = c3.generate({
        bindto: '#chart5',
        data: {
            x: '<Ek>',
            columns: [
                mean_ek,
                m
            ]
        },
        legend: {
            show: false
        },
        transition: {
            duration: 0
        },
        tooltip: {
            show: false
        },
        size: {
            width: CHART_WIDTH,
            height: CHART_HEIGHT,
        },
        axis: {
            y: {
                label: "<p>",
                padding: {top: 0, bottom: 0, left:0, right:0},
                tick: {format:function(n) {return n.toFixed(3)}, count:4}
            },
            x: {
                label: "<Ek>",
                padding: {top: 0, bottom: 0, left:0, right:0},
                tick: {format:function(n){return n.toFixed(3);}, count: 4}
            },
        }
    });
    setTimeout(draw_stat_chart, 200);
}
draw_stat_chart();