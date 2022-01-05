'use strict';

import { Animation, Timeline, InterpolationPool, Easing } from '@remvst/animate.js';
import { Rectangle } from '@remvst/geometry';
import { randInt } from '@remvst/random';

function pointDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

function between(
    a: number,
    b: number,
    c: number
) {
    if (b < a) {
        return a;
    } if (b > c) {
        return c;
    }
    return b;
};

function inRectangle(
    x: number,
    y: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    deltaX: number = 0,
    deltaY: number = 0
) {
    return x + deltaX >= rectX &&
           y + deltaY >= rectY &&
           x - deltaX <= rectX + rectWidth &&
           y - deltaY <= rectY + rectHeight;
}

export function reachTargetWithin(duration: number): (position: Point, targetPosition: Point) => number {
    return (position, targetPosition): number => {
        const distance = pointDistance(targetPosition.x, targetPosition.y, position.x, position.y);
        return Math.max(1, distance / duration);
    };
}

export interface Point {
    x: number;
    y: number;
}

export default class Camera {

    viewport: Rectangle;
    bounds: Rectangle;
    speed: (position: Point, targetPosition: Point) => number = reachTargetWithin(0.2);
    private reusedVisibleRectangle: Rectangle;
    private readonly interpolationPool: InterpolationPool;

    target: Point | null;
    center: Point;
    position: Point;
    idealCenter: Point;

    shakeOffset: Point;
    nextShakeUpdate: number;
    shakePower: number;
    frozen: boolean;
    zoom: number;
    shakeTimeline: Timeline | null;

    constructor(options: {
        viewport: Rectangle,
        bounds: Rectangle,
        interpolationPool: InterpolationPool,
        speed: ((position: Point, targetPosition: Point) => number) | null,
    }) {
        this.viewport = options.viewport;
        this.bounds = options.bounds;
        this.interpolationPool = options.interpolationPool;
        this.speed = options.speed || this.speed;

        this.reusedVisibleRectangle = new Rectangle(0, 0, 0, 0);

        this.target = null;
        this.shakeOffset = {'x': 0, 'y': 0};
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

    shake(power: number, duration: number) {
        if (this.shakeTimeline) {
            this.shakeTimeline.cancel();
        }

        this.shakePower = Math.max(this.shakePower, power);

        this.shakeTimeline = new Timeline()
            .wait(duration)
            .append(() => this.shakePower = 0)
            .run(this.interpolationPool);
    }

    follow(target: Point) {
        this.target = target;
    }

    cycle(elapsed: number) {
        const targetPosition = this.idealTargetPosition();

        const distance = pointDistance(targetPosition.x, targetPosition.y, this.idealCenter.x, this.idealCenter.y),
            speed = this.speed(this.idealCenter, targetPosition),
            angle = Math.atan2(targetPosition.y - this.idealCenter.y, targetPosition.x - this.idealCenter.x),
            appliedDistance = Math.min(speed * elapsed, distance);

        this.idealCenter.x += Math.cos(angle) * appliedDistance;
        this.idealCenter.y += Math.sin(angle) * appliedDistance;

        this.center = this.withinBounds(this.idealCenter);

        const sizeOnWorld = this.visibleRectangleSizeInWorldUnits();

        this.nextShakeUpdate -= elapsed;
        if (this.nextShakeUpdate <= 0) {
            this.nextShakeUpdate = 1 / 60;
            this.shakeOffset.x = randInt(-50, 50) * this.shakePower;
            this.shakeOffset.y = randInt(-50, 50) * this.shakePower;
        }

        this.position.x = ~~(this.shakeOffset.x + this.center.x - sizeOnWorld.width / 2);
        this.position.y = ~~(this.shakeOffset.y + this.center.y - sizeOnWorld.height / 2);
    }

    withinBounds(position: Point) {
        const sizeOnWorld = this.visibleRectangleSizeInWorldUnits();

        return {
            'x': ~~between(
                this.bounds.x + sizeOnWorld.width / 2,
                position.x,
                this.bounds.x + this.bounds.width - sizeOnWorld.width / 2
            ),
            'y': ~~between(
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

        return {
            'x': this.target.x,
            'y': this.target.y
        };
    }

    containsPoint(x: number, y: number, delta: number = 0) {
        return x >= this.position.x - delta &&
               y >= this.position.y - delta &&
               x <= this.position.x + this.viewport.width / this.zoom + delta &&
               y <= this.position.y + this.viewport.height / this.zoom + delta;
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

    positionOnScreen(
        x: number,
        y: number
    ) {
        return {
            'x': x - this.position.x,
            'y': y - this.position.y
        };
    }

    zoomTo(zoom: number, duration: number) {
        new Animation(this)
            .interp('zoom', this.zoom, zoom, Easing.easeInOutQuad)
            .during(duration)
            .run(this.interpolationPool);
    }

    isPointVisible(
        x: number,
        y: number,
        deltaX: number = 0,
        deltaY: number = 0
    ): boolean {
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
