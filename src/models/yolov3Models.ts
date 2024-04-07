export interface point2f {
    X: number,
    Y: number,
}

export interface size2f {
    Width: number,
    Height: number,
}

export interface obj_id {
    name_id: number,
    name: string,
    prob: number,
}

export interface RotatedRect {
    Center: point2f,
    Size: size2f,
    Angle: number,

}

export interface obj_box {
    id: number,
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    center: point2f,
    Obj_IDs: obj_id[],
    obj_id: number,
    obj_name: string,
    prob: number,
    track_id: number,
    frames_counter: number,
    RotatedBox: RotatedRect,
    BoxPoints: point2f[],
    DetectTime: number,
    YoloTime: number,
}
