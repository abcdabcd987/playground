function Pendulum(init_theta1, init_theta2) {
    paper.project.clear();

    //------ canvas constant
    var PIVOT = new Point(window.innerWidth/2, window.innerHeight/3);
    var PIVOT_RADIUS = 3;
    var STATUS_REFRESH_INTERVAL = 3;

    //------ canvas objects
    var c_pivot = new Path.Circle(PIVOT, PIVOT_RADIUS);
    var c_ball1 = new Path.Circle(PIVOT, PIVOT_RADIUS);
    var c_ball2 = new Path.Circle(PIVOT, PIVOT_RADIUS);
    var c_rope = new Path();
    var c_track1 = new Path();
    var c_track2 = new Path();

    c_pivot.fillColor = 'black';
    c_ball1.fillColor = 'red';
    c_ball2.fillColor = 'blue';

    c_rope.strokeColor = 'black';
    c_rope.add(c_pivot.position);
    c_rope.add(c_ball1.position);
    c_rope.add(c_ball2.position);

    c_track1.strokeColor = 'red';
    c_track2.strokeColor = 'blue';

    //------ variables
    var l = 100;
    var m = 1;
    var g = 10;
    var theta1 = init_theta1;
    var ptheta1 = 0;
    var theta2 = init_theta2;
    var ptheta2 = 0;

    function f_theta1(t, y) { return 6/(m*l*l) * (2*y[2]-3*Math.cos(y[0]-y[1])*y[3]) / (16-9*Math.pow(Math.cos(y[0]-y[1]), 2)); }
    function f_theta2(t, y) { return 6/(m*l*l) * (8*y[3]-3*Math.cos(y[0]-y[1])*y[2]) / (16-9*Math.pow(Math.cos(y[0]-y[1]), 2)); }
    function f_ptheta1(t, y){ return -1/2*m*l*l * (f_theta1(t,y)*f_theta2(t,y)*Math.sin(y[0]-y[1]) + 3*g/l*Math.sin(y[0])); }
    function f_ptheta2(t, y){ return -1/2*m*l*l * (-f_theta1(t,y)*f_theta2(t,y)*Math.sin(y[0]-y[1]) + g/l*Math.sin(y[1])); }
    var f = [f_theta1, f_theta2, f_ptheta1, f_ptheta2];
    var y = [theta1, theta2, ptheta1, ptheta2];

    //------ animation
    var status_count = 0;
    var sum_calc_time = 0;
    var sum_delta_time = 0;
    view.onFrame = function(event) {
        var st = (new Date()).getTime();

        for (var T = 0; T < demo_speed; ++T) {
            y = runge_kutta(f, 0, y, 0.01);
            theta1 = y[0], theta2 = y[1], ptheta1 = y[2], ptheta2 = y[3];

            c_ball1.position.x = PIVOT.x + l * Math.sin(theta1);
            c_ball1.position.y = PIVOT.y + l * Math.cos(theta1);
            c_rope.segments[1].point = c_ball1.position;

            c_ball2.position.x = c_ball1.position.x + l * Math.sin(theta2);
            c_ball2.position.y = c_ball1.position.y + l * Math.cos(theta2);
            c_rope.segments[2].point = c_ball2.position;

            c_track1.add(c_ball1.position);
            c_track2.add(c_ball2.position);
            while (c_track1.segments.length > demo_track_points) c_track1.removeSegment(0);
            while (c_track2.segments.length > demo_track_points) c_track2.removeSegment(0);
        }

        var ed = (new Date()).getTime();

        sum_calc_time += ed-st;
        sum_delta_time += event.delta;
        ++status_count;
        if (status_count >= STATUS_REFRESH_INTERVAL) {
            $("calc-time").innerHTML = (sum_calc_time/STATUS_REFRESH_INTERVAL).toFixed(0);
            $("fps").innerHTML = (STATUS_REFRESH_INTERVAL/sum_delta_time).toFixed(0);
            status_count = sum_calc_time = sum_delta_time = 0;
        }
    }
}

function set_demo_speed() {
    demo_speed = $('speed-slider').value;
    $('speed').innerHTML = demo_speed;
}

function set_demo_track_points() {
    demo_track_points = $('track-slider').value;
    $('track-points').innerHTML = demo_track_points;
}

Pendulum(Math.PI/2, 5*Math.PI/4);
