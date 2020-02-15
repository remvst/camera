'use strict';

const Animation = require('@remvst/animate.js').Animation;
const Timeline = require('@remvst/animate.js').Timeline;
const Rectangle = require('@remvst/geometry/rectangle');
const Random = require('@remvst/random');

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

        this.reusedVisibleRectangle = new Rectangle(0, 0, 0, 0);

        this.target = null;
        this.shakeOffset = {'x': 0, 'y': 0};
        this.nextShakeUpdate = 0;
        this.shakePower = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.facingOffset = 50;
        this.frozen = false;
        this.zoom = 1;
        this.offsetDistanceFactor = 400;
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

        this.shakeTimeline = new Timeline()
            .wait(duration)
            .add(() => this.shakePower = 0)
            .run(this.interpolationPool);
    }

    follow(target) {
        this.target = target;
    }

    cycle(e) {
        const targetPosition = this.idealTargetPosition();

        const distance = Math.distance(targetPosition, this.idealCenter),
            speed = Math.max(1, distance / 0.2),
            angle = Math.atan2(targetPosition.y - this.idealCenter.y, targetPosition.x - this.idealCenter.x),
            appliedDistance = Math.min(speed * e, distance);

        this.idealCenter.x += Math.cos(angle) * appliedDistance;
        this.idealCenter.y += Math.sin(angle) * appliedDistance;

        this.center = this.withinBounds(this.idealCenter);

        const sizeOnWorld = this.visibleRectangleSizeInWorldUnits();

        this.nextShakeUpdate -= e;
        if (this.nextShakeUpdate <= 0) {
            this.nextShakeUpdate = 1 / 60;
            this.shakeOffset.x = Random.randInt(-50, 50) * this.shakePower;
            this.shakeOffset.y = Random.randInt(-50, 50) * this.shakePower;
        }

        this.position.x = ~~(this.shakeOffset.x + this.center.x - sizeOnWorld.width / 2);
        this.position.y = ~~(this.shakeOffset.y + this.center.y - sizeOnWorld.height / 2);
    }

    withinBounds(position) {
        const sizeOnWorld = this.visibleRectangleSizeInWorldUnits();

        return {
            'x': ~~Math.between(
                this.bounds.x + sizeOnWorld.width / 2,
                position.x,
                this.bounds.x + this.bounds.width - sizeOnWorld.width / 2
            ),
            'y': ~~Math.between(
                this.bounds.y + sizeOnWorld.height / 2,
                position.y,
                this.bounds.y + this.bounds.height - sizeOnWorld.height / 2
            )
        };
    }

    idealTargetPosition() {
        if (!this.target || this.frozen) {
            return this.center;
        }

        const regular = {
            'x': this.target.x + (this.target.facing || 0) * this.facingOffset,
            'y': this.target.y
        };

        return {
            'x': regular.x + this.offsetX * this.offsetDistanceFactor / this.zoom,
            'y': regular.y + this.offsetY * this.offsetDistanceFactor / this.zoom
        };
    }

    containsPoint(x, y, delta) {
        return x >= this.position.x - delta &&
               y >= this.position.y - delta &&
               x <= this.position.x + this.viewport.width / this.zoom + delta &&
               y <= this.position.y + this.viewport.height / this.zoom + delta;
    }

    between(a, b, c) {
        return a <= b && b <= c;
    }

    visibleRectangle() {
        this.reusedVisibleRectangle.update(
            this.position.x,
            this.position.y,
            this.viewport.width / this.zoom,
            this.viewport.height / this.zoom
        );

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
        new Animation(this)
            .interp('zoom', this.zoom, zoom, Math.easeInOutSine)
            .during(duration)
            .run(this.interpolationPool);
    }

    isPointVisible(x, y, deltaX = 0, deltaY = 0) {
        const visibleRectangle = this.visibleRectangle();

        return inRectangle(
            x,
            y,
            visibleRectangle.x,
            visibleRectangle.y,
            visibleRectangle.width,
            visibleRectangle.height,
            deltaX,
            deltaY
        );
    }

}

module.exports = Camera;
