// smith added 2024-4-2

export interface JsonResult {
    return_code: number,
    message?: string,
    data?: any
}


export interface IYolov3Service {
    DetectImageAsync(image_path: string): Promise<JsonResult>;
}

export default class Yolov3Service implements IYolov3Service {
    apiUrl: string;

    constructor(autoDetectApiUrl?: string) {
        if (autoDetectApiUrl)
            this.apiUrl = autoDetectApiUrl;
        else
            this.apiUrl = `http://localhost:50505/api/YOLOv3/detect/`;

        if (!this.apiUrl.endsWith("/"))
            this.apiUrl += "/";
    }
    public async DetectImageAsync(image_path: string): Promise<JsonResult> {
        try {
            const response = await fetch(`http://localhost:50505/api/YOLOv3/detect/${image_path}`);
            const result: JsonResult = await response.json();
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }

    }
}



