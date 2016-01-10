function Arnold(url) {
    paper.project.clear();
    var c = new Raster(url);
    var stop = false;
    c.position = view.center;
    c.onLoad = function() {
        var n = c.size.width;
        var m = c.size.height;
        var ctx = c.context;
        var rect = new Rectangle(0, 0, n, m);
        var zero = new Point(0, 0);
        var original = new Uint8ClampedArray(c.getImageData(rect).data);
        view.onFrame = function(e) {
            if (e.count % demo_speed || stop) return;
            
            stop = true;
            var now = c.getImageData(rect);
            var old = new Uint8ClampedArray(now.data);
            for (var y = 0; y < m; ++y) {
                for (var x = 0; x < n; ++x) {
                    var p = y       * n + x;
                    var q = (x+y)%n * n + (2*x+y)%n;
                    now.data[4*p]   = old[4*q];
                    now.data[4*p+1] = old[4*q+1];
                    now.data[4*p+2] = old[4*q+2];
                    now.data[4*p+3] = old[4*q+3];
                    stop = stop && now.data[4*p]   == original[4*p]
                                && now.data[4*p+1] == original[4*p+1]
                                && now.data[4*p+2] == original[4*p+2]
                                && now.data[4*p+3] == original[4*p+3];
                }
            }
            c.setImageData(now, zero);
            var iter = $('iterations');
            iter.innerHTML = Number(iter.innerHTML) + 1;
        }
    }
}

function set_demo_speed() {
    demo_speed = 61-$('speed-slider').value;
    $('speed').innerHTML = $('speed-slider').value;
}

