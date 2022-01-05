import { Timeline, InterpolationPool } from '@remvst/animate.js';
import { Rectangle } from '@remvst/geometry';
export declare function reachTargetWithin(duration: number): (position: Point, targetPosition: Point) => number;
export interface Point {
    x: number;
    y: number;
}
export default class Camera {
    viewport: Rectangle;
    bounds: Rectangle;
    speed: (position: Point, targetPosition: Point) => number;
    private reusedVisibleRectangle;
    private readonly interpolationPool;
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
        viewport: Rectangle;
        bounds: Rectangle;
        interpolationPool: InterpolationPool;
        speed: ((position: Point, targetPosition: Point) => number) | null;
    });
    visibleRectangleSizeInWorldUnits(): {
        width: number;
        height: number;
    };
    shake(power: number, duration: number): void;
    follow(target: Point): void;
    cycle(elapsed: number): void;
    withinBounds(position: Point): {
        x: number;
        y: number;
    };
    idealTargetPosition(): Point;
    containsPoint(x: number, y: number, delta?: number): boolean;
    visibleRectangle(): Rectangle;
    recenter(): void;
    freeze(): void;
    positionOnScreen(x: number, y: number): {
        x: number;
        y: number;
    };
    zoomTo(zoom: number, duration: number): void;
    isPointVisible(x: number, y: number, deltaX?: number, deltaY?: number): boolean;
}
