// -- CanvasWolf - Wolfenstein 3D in a Canvas
// -- (c) 2007 by Arthur Langereis of xfinitegames
// -- arthur_ext {at} xfinitegames {dot} com

// This toy has no connection whatsoever to id Software.
// Similarly, unlike the good people of Id, the author does not own
// any Ferraris. Donations to my person to alleviate this problem
// are always welcomed.


// ==================================================================
// Constants
// ==================================================================
var JSF_PI = 3.14159265358979323846;

var JSF_QUARTER_PI = JSF_PI / 4;
var JSF_HALF_PI = JSF_PI / 2;
var JSF_3QUARTER_PI = (JSF_PI * 3) / 4;

var JSF_ONE_QUARTER_PI = JSF_PI + JSF_QUARTER_PI;
var JSF_ONE_HALF_PI = JSF_PI + JSF_HALF_PI;
var JSF_ONE_3QUARTER_PI = JSF_PI + JSF_3QUARTER_PI;

var JSF_TWO_PI = JSF_PI * 2;

var JSF_WOLF_FOV = JSF_HALF_PI / 1.5;
var JSF_WOLF_HALF_FOV = JSF_WOLF_FOV / 2;


// ==================================================================
// Code
// ==================================================================

// -------------------------------

var System = { _elInfo: null };

System.SetInfo = function(s) { (this._elInfo || (this._elInfo = D_Elem("info"))).innerHTML = s; };

System.GetTicks = function() { return new Date().getTime(); };


// -------------------------------

var FPSCounter = {
	_zeroTix: 0, _frameCount: 0, _iid: -1
};

FPSCounter.Start = function(updateFrequency) {
	if(this._iid) this.Stop();

	this.Resync();
	this._iid = setInterval(this.UpdateView.bind(this), 1000 / (updateFrequency || 10));
};

FPSCounter.Resync = function() { this._frameCount = 0; this._zeroTix = System.GetTicks(); };

FPSCounter.Stop = function() { if(this._iid > -1) clearInterval(this._iid); this._iid = -1; };

FPSCounter.IncFrame = function() { ++this._frameCount; };

FPSCounter.UpdateView = function() {
	System.SetInfo( (Math.round(this._frameCount / ((System.GetTicks() - this._zeroTix) / 10000)) / 10) + " fps");
	this.Resync();
};


// -------------------------------

var CanvasWolf = {
	_levels: [],
	_vseg: [],

	_curmap: null, _mapw: 0, _maph: 0,
	_px: 0, _py: 0, _pr: 0,
	
	_ctx: null, _ctxW: 0, _ctxH: 0,
	_fovinc: 0,
	
	_running: false,

	_vel: 0, _rotVel: 0
};



CanvasWolf.CalcVSegs = function() {
	var r = this._pr - JSF_WOLF_HALF_FOV, tanR;
	var x = this._px; y = this._py;
	var hx, hy, mhx, mhy, vx, vy, mvx, mvy;
	var stepVX, stepVY, stepHX, stepHY;
	var mapvalH = 0, mapvalV = 0;

	var steps = this._lowRes ? (this._ctxW >> 1) : this._ctxW;

	for(var i=0; i < steps; ++i) {
		tanR = Math.tan(r);

		// horizontal scan
		if(tanR != 0) {
			var angleUp = (Math.sin(r) > 0);
			if(angleUp) {
				hy = Math.floor(y);
				stepHY = -1;
				stepHX = 1.0 / tanR;
			} else {
				hy = Math.ceil(y);
				stepHY = 1;
				stepHX = -1.0 / tanR;
			}
			hx = x + ((y - hy) / tanR);
			mhx = Math.floor(hx); mhy = hy;
			if(angleUp) --mhy;

			do {
				if((mapvalH = this._curmap[(mhy * this._mapw) + mhx]) == null) mapvalH = 1;
				if(!mapvalH) {
					hx += stepHX; hy += stepHY;
					mhx = Math.floor(hx); mhy += stepHY;
				}
			} while(!mapvalH);
		}

		// vertical scan
		if(tanR != 1) {
			var angleLeft = (Math.cos(r) < 0);
			if(angleLeft) {
				vx = Math.floor(x);
				stepVX = -1;
				stepVY = tanR;
			} else {
				vx = Math.ceil(x);
				stepVX = 1;
				stepVY = -tanR;
			}
			vy = y + ((x - vx) * tanR);
			mvx = vx; mvy = Math.floor(vy);
			if(angleLeft) --mvx;

			do {
				if((mapvalV = this._curmap[(mvy * this._mapw) + mvx]) == null) mapvalV = 1;
				if(!mapvalV) {
					vx += stepVX; vy += stepVY;
					mvx += stepVX; mvy = Math.floor(vy);
				}
			} while(!mapvalV);
		}

		// process wall hits
		var dx, dy, tdist, dist, mapval, wallfrac;
		if(mapvalV) {
			dx = x - vx; dy = y - vy;
			dist = (dx*dx) + (dy*dy);
			mapval = mapvalV;
			wallfrac = vy - mvy;

			if(mapvalH) {
				dx = x - hx; dy = y - hy;
				tdist = (dx*dx) + (dy*dy);
				if(tdist < dist) {
					dist = tdist;
					mapval = mapvalH;
					wallfrac = hx - mhx;
				}
			}
		} else {
			dx = x - hx; dy = y - hy;
			dist = (dx*dx) + (dy*dy);
			mapval = mapvalH;
			wallfrac = hx - mhx;
		}

		// -- complete vseg record
		this._vseg[steps - 1 - i] = {
			z: Math.cos(r - this._pr) * Math.sqrt(dist),
			wp: wallfrac, t: mapval
		};

		r += this._fovinc;
		if(r >= JSF_TWO_PI) r -= JSF_TWO_PI;
	}
};


CanvasWolf.CalcVSegsOld = function() {
	// -- determine z-values and wallindices/offsets for all v-segs
	var x, y, fx,fy, r = this._pr - JSF_WOLF_HALF_FOV, rs,rc, dx,dy, mx, my, mapval, hh, wf;

	var steps = this._lowRes ? (this._ctxW >> 1) : this._ctxW;
	for(var i=0; i < steps; ++i) {
		x = this._px; y = this._py;
		mx = Math.floor(x); my = Math.floor(y);
		rs = Math.sin(r); rc = Math.cos(r);

		wf = 0;

		do {
			// -- get delta x for current angle
			if(x == mx)
				dx = (rc > 0) ? 1 : ((rc < 0) ? -1 : 9999);
			else
				dx = ((rc > 0) ? (1 - (x - mx)) : ((rc < 0) ? (mx - x) : 9999));

			// -- get delta y for current angle
			if(y == my)
				dy = (rs > 0) ? 1 : ((rs < 0) ? -1 : 9999);
			else
				dy = ((rs > 0) ? (1 - (y - my)) : ((rs < 0) ? (my - y) : 9999));
			
			// -- get relative lengths based on angle
			fx = dx / rc;
			fy = dy / rs;

			if(Math.abs(fx) < Math.abs(fy)) {
				x = x + dx;
				y += fx * rs;
				mx = x; my = Math.floor(y);
				tx = mx - (dx<0 ? 1 : 0); ty = my;
				wf = y - my;

			} else {
				y = y + dy;
				x += fy * rc;
				my = y; mx = Math.floor(x);
				tx = mx; ty = my - (dy<0 ? 1 : 0);
				wf = x - mx;
			}
			
			if((mapval = this._curmap[(ty * this._mapw) + tx]) == null) mapval = 1;
		} while( ((mapval & 0x7f) == 0));

		var dpx = this._px - x, dpy = this._py - y;
		this._vseg[i] = {
			z: Math.cos(r - this._pr) * Math.sqrt( (dpx*dpx) + (dpy*dpy) ),
			wp: wf, t: mapval
		};

		r += this._fovinc;
		if(r >= JSF_TWO_PI) r -= JSF_TWO_PI;
	}
};


CanvasWolf.ShadingTable = ["#fff","#fff","#fff","#eee","#eee","#ddd","#ddd","#ccc","#bbb","#aaa","#999","#888","#777","#666","#555","#444","#333","#222","#111","#000"];

CanvasWolf.RenderView = function() {
	var halfH = this._ctxH >> 1;
	var spanW = this._lowRes ? 2 : 1;
	var steps = this._lowRes ? (this._ctxW >> 1) : this._ctxW;

	this._ctx.globalCompositeOperation = "source-over";

	// -- ceiling
	this._ctx.fillStyle = this._ceiling;
	this._ctx.fillRect(0, 0, this._ctxW, halfH);

	// -- floor
	this._ctx.fillStyle = this._floor;
	this._ctx.fillRect(0, halfH, this._ctxW, halfH);
	
	// -- segs
	for(var x=0; x<steps; ++x) {
		// base texture
		var hh = (0.5 / this._vseg[x].z) * this._projPlaneDistance;
		this._ctx.drawImage(this._walls[this._vseg[x].t], Math.round(this._vseg[x].wp * 63), 0, 1, 64, x * spanW, halfH - hh, spanW, hh * 2);

		if(this._shading) {
			// depth shading
			this._ctx.globalCompositeOperation = "darker";
			this._ctx.fillStyle = CanvasWolf.ShadingTable[Math.floor(this._vseg[x].z)] || "#000";
			this._ctx.fillRect(x * spanW, halfH - hh, spanW, hh * 2);
			this._ctx.globalCompositeOperation = "source-over";
		}
	}
};


CanvasWolf.ProcessFrame = function() {
	this.CalcVSegs();
	if(this._ctx) try { this.RenderView(); } catch(e) {}

	// apply keys to speed
	this.ProcessKeys();

	// apply speed and clip
	var p_radius = this._psize;
	var source_x = this._px;
	var source_y = this._py;
	var vector_x = (this._vel * Math.cos(this._pr));
	var vector_y = -(this._vel * Math.sin(this._pr));
	var target_x = source_x + vector_x;
	var target_y = source_y + vector_y;

	var source_tile_x = Math.floor(source_x);
	var source_tile_y = Math.floor(source_y);

	var test_x, test_y, clip_x = -1, clip_y = -1;

	// -- determine clipping lines (max one x-clip (x = n) and one y-clip (y = n))
	if(vector_x > 0) {
		test_x = Math.floor(target_x + p_radius);
		if((test_x != source_tile_x) && (0 !== this._curmap[(source_tile_y * this._mapw) + test_x]))
			clip_x = test_x - p_radius;

		if(vector_y > 0) {
			test_y = Math.floor(target_y + p_radius);
			if((test_y != source_tile_y) && (0 !== this._curmap[(test_y * this._mapw) + source_tile_x]))
				clip_y = test_y - p_radius;

			test_x = Math.floor(source_x + ((this._vel + p_radius) * Math.cos(this._pr)));
			test_y = Math.floor(source_y - ((this._vel + p_radius) * Math.sin(this._pr)));
			if((test_y != source_tile_y) && (test_x != source_tile_x) && (0 !== this._curmap[(test_y * this._mapw) + test_x])) {
				clip_x = test_x - p_radius;
				clip_y = test_y - p_radius;
			}
		} else {
			test_y = Math.floor(target_y - p_radius);
			if((test_y != source_tile_y) && (0 !== this._curmap[(test_y * this._mapw) + source_tile_x]))
				clip_y = source_tile_y + p_radius;

			test_x = Math.floor(source_x + ((this._vel + p_radius) * Math.cos(this._pr)));
			test_y = Math.floor(source_y - ((this._vel + p_radius) * Math.sin(this._pr)));
			if((test_y != source_tile_y) && (test_x != source_tile_x) && (0 !== this._curmap[(test_y * this._mapw) + test_x])) {
				clip_x = test_x - p_radius;
				clip_y = source_tile_y + p_radius;
			}
		}	
	}
	else {
		test_x = Math.floor(target_x - p_radius);
		if((test_x != source_tile_x) && (0 !== this._curmap[(source_tile_y * this._mapw) + test_x]))
			clip_x = source_tile_x + p_radius;

		if(vector_y > 0) {
			test_y = Math.floor(target_y + p_radius);
			if((test_y != source_tile_y) && (0 !== this._curmap[(test_y * this._mapw) + source_tile_x]))
				clip_y = test_y - p_radius;

			test_x = Math.floor(source_x + ((this._vel + p_radius) * Math.cos(this._pr)));
			test_y = Math.floor(source_y - ((this._vel + p_radius) * Math.sin(this._pr)));
			if((test_y != source_tile_y) && (test_x != source_tile_x) && (0 !== this._curmap[(test_y * this._mapw) + test_x])) {
				clip_x = source_tile_x + p_radius;
				clip_y = test_y - p_radius;
			}
		} else {
			test_y = Math.floor(target_y - p_radius);
			if((test_y != source_tile_y) && (0 !== this._curmap[(test_y * this._mapw) + source_tile_x]))
				clip_y = source_tile_y + p_radius;

			test_x = Math.floor(source_x + ((this._vel + p_radius) * Math.cos(this._pr)));
			test_y = Math.floor(source_y - ((this._vel + p_radius) * Math.sin(this._pr)));
			if((test_y != source_tile_y) && (test_x != source_tile_x) && (0 !== this._curmap[(test_y * this._mapw) + test_x])) {
				clip_x = source_tile_x + p_radius;
				clip_y = source_tile_y + p_radius;
			}
		}	
	}

	// -- clip on x
	if(clip_x != -1) {
		target_x = clip_x;
		vector_x = target_x - source_x;
		target_y = source_y + vector_y;
	}
	
	// -- clip on y
	if(clip_y != -1) {
		target_y = clip_y;
		vector_y = target_y - source_y;
		target_x = source_x + vector_x;
	}

	window.status = "px: " + source_x.toString().substr(0,4) + ", py: " + source_y.toString().substr(0,4) + ", cx: " + clip_x + ", cy: " + clip_y;

	this._px = target_x;
	this._py = target_y;

	// apply rotation
	this._pr += this._rotVel;
	if(this._pr >= JSF_TWO_PI) this._pr -= JSF_TWO_PI;
	else if(this._pr < 0) this._pr += JSF_TWO_PI;

	FPSCounter.IncFrame();
	if(this._running) setTimeout(this.ProcessFrame.bind(this), 10);
};


CanvasWolf.LoadLevel = function(ln) {
	if(ln < 0 || ln >= this._levels.length) E_Raise("Invalid level nr: " + ln);
	var l = this._levels[ln];

	this._curmap = l.map; this._mapw = l.mapw; this._maph = l.maph;
	this._px = l.px; this._py = l.py; this._pr = l.pr;
	this._psize = 0.35;
};


CanvasWolf.InitLevels = function() {
	this._levels[0] = {
		mapw: 6, maph: 6,
		map: [
			1, 1, 2, 2, 1, 1,
			1, 2, 0, 0, 0, 1,
			1, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 0, 1,
			1, 0, 0, 2, 0, 1,
			1, 1, 1, 1, 1, 1,
		],
		
		px: 3, py: 3, pr: 1.5 * JSF_PI
	};

	this._levels[1] = {
		mapw: 32, maph: 16,
		map: [
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 3, 2, 2, 2, 3, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 2, 2, 2, 3, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
		],
		
		px: 2.5, py: 6.5, pr: 1.5 * JSF_PI
	};

	this.LoadLevel(1);
};


CanvasWolf.Start = function() {
	FPSCounter.Start(1);
	this._running = true;

	this.ProcessFrame();
};


CanvasWolf.Stop = function() {
	FPSCounter.Stop();
	this._running = false;
};


CanvasWolf.ProcessKeys = function() {
	this._rotVel = 0;
	this._vel = 0;

	for(var code in this._controlMap) {
		if(this._keyMap[code]) {
			var vec = this._controlMap[code];
			this._rotVel += vec[0];
			this._vel += vec[1];
		}
	}
};


CanvasWolf.Init = function(canvasElem, lowRes, shading) {
	this._lowRes = lowRes || false;
	this._shading = shading || false;

	// -- view setup
	this._ctx = canvasElem.getContext("2d");
	this._ctxW = canvasElem.offsetWidth; this._ctxH = canvasElem.offsetHeight;

	canvasElem.width = parseInt(this._ctxW);	// canvases need width and height attrs set to work (we use css)
	canvasElem.height = parseInt(this._ctxH);

	this._fovinc = JSF_WOLF_FOV / (this._lowRes ? (this._ctxW >> 1) : this._ctxW);
	this._projPlaneDistance = (this._ctxW >> 1) / Math.tan(JSF_WOLF_HALF_FOV);

	// -- wall textures
	this._walls = [null];
	for(var x=1; x<4; ++x) {
		this._walls[x] = new Image();
		this._walls[x].src = "Wall_" + x + ".gif";
	}

	// -- ceiling and floor
	if(this._shading) {
		this._ceiling = this._ctx.createLinearGradient(0,0,0,this._ctxH >> 1);
		this._ceiling.addColorStop(0, '#333333');
		this._ceiling.addColorStop(1, '#111111');
	
		this._floor = this._ctx.createLinearGradient(0,this._ctxH >> 1,0,this._ctxH);
		this._floor.addColorStop(0, '#222222');
		this._floor.addColorStop(1, '#555555');
	} else {
		this._ceiling = "#333333";
		this._floor = "#555555";
	}

	
	// -- setup levels
	this.InitLevels();


	// -- key mapping
	this._keyMap = {};
	this._controlMap = {};
	this._controlMap["37"] = [0.12, 0];
	this._controlMap["38"] = [0, 0.25];
	this._controlMap["39"] = [-0.12, 0];
	this._controlMap["40"] = [0, -0.25];

	D_AddEvent(window, "keydown", function(e) {
		this._keyMap[e.keyCode] = 1;
	}, this);
	
	D_AddEvent(window, "keyup", function(e) {
		this._keyMap[e.keyCode] = 0;
	}, this);
	
	if(0) D_AddEvent(canvasElem, "mousemove", function(evt, type, src){
		var localX = evt.layerX || evt.offsetX, localY = evt.layerY || evt.offsetY;
		localX -= src.offsetLeft; localY -= src.offsetTop;
		
		if(localX <= this._ctxW >> 2) this._rotVel = 0.15;
		else if(localX >= (this._ctxW * 3 / 4)) this._rotVel = -0.15;
		else this._rotVel = 0;

		if(localY <= this._ctxH >> 2) this._vel = 0.25;
		else if(localY >= (this._ctxH * 3 / 4)) this._vel = -0.25;
		else this._vel = 0;
	}.bind(this));

	if(0) D_AddEvent(canvasElem, "mouseout", function(evt, type, src){
		this._vel = 0; this._rotVel = 0;
	}.bind(this));
};
