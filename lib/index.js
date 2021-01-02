'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const animate_js_1 = require("@remvst/animate.js");
const geometry_1 = require("@remvst/geometry");
const random_1 = require("@remvst/random");
function pointDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
;
function between(a, b, c) {
    if (b < a) {
        return a;
    }
    if (b > c) {
        return c;
    }
    return b;
}
;
function inRectangle(x, y, rectX, rectY, rectWidth, rectHeight, deltaX = 0, deltaY = 0) {
    return x + deltaX >= rectX &&
        y + deltaY >= rectY &&
        x - deltaX <= rectX + rectWidth &&
        y - deltaY <= rectY + rectHeight;
}
class Camera {
    constructor(options) {
        this.viewport = options.viewport;
        this.bounds = options.bounds;
        this.interpolationPool = options.interpolationPool;
        this.reusedVisibleRectangle = new geometry_1.Rectangle(0, 0, 0, 0);
        this.target = null;
        this.shakeOffset = { 'x': 0, 'y': 0 };
        this.nextShakeUpdate = 0;
        this.shakePower = 0;
        this.frozen = false;
        this.zoom = 1;
        this.shakeTimeline = null;
        this.center = this.withinBounds({ 'x': 0, 'y': 0 });
        this.position = { 'x': 0, 'y': 0 };
        this.idealCenter = { 'x': 0, 'y': 0 };
    }
    visibleRectangleSizeInWorldUnits() {
        return {
            'width': this.viewport.width / this.zoom,
            'height': this.viewport.height / this.zoom
        };
    }
    shake(power, duration) {
        if (this.shakeTimeline) {
            this.shakeTimeline.cancel();
        }
        this.shakePower = Math.max(this.shakePower, power);
        this.shakeTimeline = new animate_js_1.Timeline()
            .wait(duration)
            .append(() => this.shakePower = 0)
            .run(this.interpolationPool);
    }
    follow(target) {
        this.target = target;
    }
    cycle(elapsed) {
        const targetPosition = this.idealTargetPosition();
        const distance = pointDistance(targetPosition.x, targetPosition.y, this.idealCenter.x, this.idealCenter.y), speed = Math.max(1, distance / 0.2), angle = Math.atan2(targetPosition.y - this.idealCenter.y, targetPosition.x - this.idealCenter.x), appliedDistance = Math.min(speed * elapsed, distance);
        this.idealCenter.x += Math.cos(angle) * appliedDistance;
        this.idealCenter.y += Math.sin(angle) * appliedDistance;
        this.center = this.withinBounds(this.idealCenter);
        const sizeOnWorld = this.visibleRectangleSizeInWorldUnits();
        this.nextShakeUpdate -= elapsed;
        if (this.nextShakeUpdate <= 0) {
            this.nextShakeUpdate = 1 / 60;
            this.shakeOffset.x = random_1.randInt(-50, 50) * this.shakePower;
            this.shakeOffset.y = random_1.randInt(-50, 50) * this.shakePower;
        }
        this.position.x = ~~(this.shakeOffset.x + this.center.x - sizeOnWorld.width / 2);
        this.position.y = ~~(this.shakeOffset.y + this.center.y - sizeOnWorld.height / 2);
    }
    withinBounds(position) {
        const sizeOnWorld = this.visibleRectangleSizeInWorldUnits();
        return {
            'x': ~~between(this.bounds.x + sizeOnWorld.width / 2, position.x, this.bounds.x + this.bounds.width - sizeOnWorld.width / 2),
            'y': ~~between(this.bounds.y + sizeOnWorld.height / 2, position.y, this.bounds.y + this.bounds.height - sizeOnWorld.height / 2)
        };
    }
    idealTargetPosition() {
        if (!this.target || this.frozen) {
            return this.center;
        }
        return {
            'x': this.target.x,
            'y': this.target.y
        };
    }
    containsPoint(x, y, delta = 0) {
        return x >= this.position.x - delta &&
            y >= this.position.y - delta &&
            x <= this.position.x + this.viewport.width / this.zoom + delta &&
            y <= this.position.y + this.viewport.height / this.zoom + delta;
    }
    visibleRectangle() {
        this.reusedVisibleRectangle.update(this.position.x, this.position.y, this.viewport.width / this.zoom, this.viewport.height / this.zoom);
        return this.reusedVisibleRectangle;
    }
    recenter() {
        this.idealCenter = this.idealTargetPosition();
    }
    freeze() {
        this.frozen = true;
    }
    positionOnScreen(x, y) {
        return {
            'x': x - this.position.x,
            'y': y - this.position.y
        };
    }
    zoomTo(zoom, duration) {
        new animate_js_1.Animation(this)
            .interp('zoom', this.zoom, zoom, animate_js_1.Easing.easeInOutQuad)
            .during(duration)
            .run(this.interpolationPool);
    }
    isPointVisible(x, y, deltaX = 0, deltaY = 0) {
        const visibleRectangle = this.visibleRectangle();
        return inRectangle(x, y, visibleRectangle.x, visibleRectangle.y, visibleRectangle.width, visibleRectangle.height, deltaX, deltaY);
    }
}
exports.default = Camera;
