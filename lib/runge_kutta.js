// Lequn Chen (abcdabcd987) @ 2016-01-09

// y' = f(t, y)
// y(t0) = y0
// return y(t)
function runge_kutta(f, t0, y0, t) {

    function add() {
        var n = arguments[0].length;
        var res = new Array(n);
        for (var i = 0; i < n; ++i) {
            res[i] = 0;
            for (var j = 0; j < arguments.length; ++j)
                res[i] += arguments[j][i];
        }
        return res;
    }

    function mul(v, k) {
        var n = v.length;
        var res = new Array(n);
        for (var i = 0; i < n; ++i)
            res[i] = v[i] * k;
        return res;
    }

    function calc(f, t, y) {
        var n = f.length;
        var res = new Array(n);
        for (var i = 0; i < n; ++i)
            res[i] = f[i](t, y);
        return res;
    }

    var STEPS = 10;
    var h = (t-t0) / STEPS;
    var ti = t0;
    var yi = y0;
    var k1 = null, k2 = null, k3 = null, k4 = null;
    for (var i = 0; i < STEPS; ++i) {
        k1 = calc(f, ti, yi);
        k2 = calc(f, ti+h/3, add(yi, mul(k1, h/3)));
        k3 = calc(f, ti+h*2/3, add(yi, mul(k2, h),mul(k1, -h/3)));
        k4 = calc(f, ti+h, add(yi, mul(k1, h), mul(k2, -h),mul(k3,h)));
        yi = add(yi, mul(add(k1, mul(k2, 3), mul(k3, 3), k4), h/8));
        ti = ti + h;
    }

    return yi;
}