function debug_start() {
    $("debug").innerHTML = "<ul>";
}
function debug(message) {
    $("debug").innerHTML += "<li>" + message + "</li>";
}
function debug_end() {
    $("debug").innerHTML += "</ul>";
}

function AtWood(mass_large, mass_small, theta0) {
    paper.project.clear();

    //------ canvas constant
    var PIVOT2 = new Point(window.innerWidth/2, window.innerHeight/2);
    var PIVOT_DISTANCE = 100;
    var PIVOT1 = PIVOT2.add([-PIVOT_DISTANCE, 0])
    var PIVOT_RADIUS = 3;
    var INIT_RADIUS = 100;
    var SMALL_BALL_RADIUS = 1;
    var LARGE_BALL_RADIUS = 10;

    //------ canvas objects
    var c_pivot1 = new Path.Circle(PIVOT1, PIVOT_RADIUS);
    var c_pivot2 = new Path.Circle(PIVOT2, PIVOT_RADIUS);
    var c_large = new Path.Circle(PIVOT1.add([0, INIT_RADIUS]), LARGE_BALL_RADIUS);
    var c_small = new Path.Circle(PIVOT2.add([0, INIT_RADIUS]), SMALL_BALL_RADIUS);
    var c_rope = new Path();
    var c_track = new Raster();
    //var c_track = new Path();

    c_pivot1.fillColor = 'black';
    c_pivot2.fillColor = 'black';
    c_large.fillColor = 'blue';
    c_small.fillColor = 'red';

    c_rope.strokeColor = 'black';
    c_rope.add(c_large.position);
    c_rope.add(c_pivot1.position);
    c_rope.add(c_pivot2.position);
    c_rope.add(c_small.position);

    //c_track.strokeColor = 'red';
    c_track.size = view.size;
    c_track.position = view.center;

    //------ variables
    var M = mass_large;
    var m = mass_small;
    var g = 10;
    var r = INIT_RADIUS;
    var pr = 0;
    var theta = theta0;
    var ptheta = 0;
    var E =  M * g * r - m * g * r * Math.cos(theta);
    var f = [function(t, y) { return y[1] / (M+m); },
             function(t, y) { return y[3]*y[3]/(m*Math.pow(r, 3)) - M*g + m*g*Math.cos(y[2]); },
             function(t, y) { return y[3] / (m * y[0] * y[0]); },
             function(t, y) { return -m*g * y[0] * Math.sin(y[2]); } ];

    //------ animation
    view.onFrame = function(event) {
        debug_start();
        var st = (new Date()).getTime();

        var vr = pr / (M + m);

        var vtheta = ptheta / m / r;
        
        var vv = Math.sqrt(vr * vr + vtheta * vtheta);
        
        var U = M * g * r - m * g * r * Math.cos(theta);
        var K = (vr * vr + vtheta * vtheta) * m / 2 + (vr * vr) * M / 2;
        {
            var d = Math.sqrt((E - U - (M + m) * vr * vr / 2) * 2 / m);
            var sgn = 1;
            if(vtheta < 0)
                sgn = -1;
            if(r < 100) {
                ptheta = sgn * d * m * r;
            }
        }
        {
            var d = Math.sqrt((E - U - m * vtheta * vtheta / 2) * 2 / (m+M));
            var sgn = 1;
            if(pr < 0)
                sgn = -1;
            if(r > 100) {
                pr = sgn * d * (m+M);
            }
        }
        debug(d);
        debug(vr);
        debug(r);
        debug(r);
        debug(K);
        debug(U);
        debug(K+U);
        for (var T = 0; T < 50; ++T) {

        var y0 = [r, pr, theta, ptheta];
        var y;
        if(r < 30) {
            if(r < 10)
                y = runge_kutta(f, 0, y0, demo_speed/20);
            else {
                y = runge_kutta(f, 0, y0, demo_speed/20);
            }
        } else {

            y = runge_kutta(f, 0, y0, demo_speed/10);
        }
        r = y[0], pr = y[1], theta = y[2], ptheta = y[3];

        c_large.position.y = PIVOT1.y + 2*INIT_RADIUS - r;
        c_rope.segments[0].point = c_large.position;

        c_small.position.x = PIVOT2.x + r * Math.sin(theta);
        c_small.position.y = PIVOT2.y + r * Math.cos(theta);
        c_rope.segments[3].point = c_small.position;

        //c_track.add(c_small.position);
         c_track.setPixel(c_small.position, 'red');
        }

        var ed = (new Date()).getTime();
        document.getElementById("elapse-time").innerHTML = (ed-st).toFixed(0) + "ms"; 
        debug_end();
    }
}

function set_demo_speed(event) {
    demo_speed = document.getElementById('speed-slider').value;
}

AtWood(21, 1, 90 / 180 * Math.PI);
