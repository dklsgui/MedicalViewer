import Reader from '../../reader';
import Viewer from '../../viewer';
import { addLabel } from '../common/index';
import { base64ToUint8Array } from '../../utils/util';
declare const layui: any;

export class DicomController {
    private _vscode: any;
    // @ts-ignore
    private _viewer: Viewer;
    private _label_alpha: number = 0.4;
    private _sliders = {
        slice: 0,
        window: [0, 0]
    };

    constructor() {
        // @ts-ignore
        this._vscode = acquireVsCodeApi();
        const add_label_icon = document.getElementById('add_label_icon') as HTMLElement;
        
        add_label_icon.addEventListener('click', () => {
            this._vscode.postMessage({
                command: 'show_label_dialog'
            });
        });
        
        // 添加插件端传输数据的监听
        window.addEventListener('message', async event => {
            if (event.data.command === 'init') {
                // 我也不知道为什么要加这一句，因为如果不加那么将HTML中的js部分会爆layui没定义的错误，或许bug+bug=normal~~
                let temp = layui.slider;
                let data = base64ToUint8Array(event.data.data);
                let image = await Reader.verify(data, "dcm", event.data.path);
                if (!(image instanceof Reader)) {
                    return;
                }
                this._viewer = new Viewer(image);

                (document.getElementById('dimensions') as HTMLElement).innerText = "2D (" + this._viewer.data.dims.join(',') + ")";
                (document.getElementById('datatype') as HTMLElement).innerText = this._viewer.data.dataType.toString();

                this._label_alpha = event.data.alpha;
                let min_threshold = event.data.level - event.data.width / 2;
                let max_threshold = event.data.level + event.data.width / 2;

                min_threshold = Math.max(min_threshold, this._viewer.min_pixel);
                max_threshold = Math.min(max_threshold, this._viewer.max_pixel);
                
                this.create_window_slider(this._viewer.min_pixel, this._viewer.max_pixel, min_threshold, max_threshold);

                this._sliders.window[0] = min_threshold;
                this._sliders.window[1] = max_threshold;
                this.drawCanvas();
            }else if (event.data.command === 'add_label') {
                let data = base64ToUint8Array(event.data.data);
                let path = event.data.path;
                let label = await Reader.verify(data, event.data.type, path, 'label');
                if (label instanceof String) {
                    return;
                }
                let name = this._viewer.add_label(label);
                this._viewer.selected_label.push(name);
                addLabel(name, path, this._viewer, this);
                this.drawCanvas();
            }else if (event.data.command === 'window_change') {
                this._sliders.window[0] = event.data.min_threshold;
                this._sliders.window[1] = event.data.max_threshold;
                this.drawCanvas();
            }else if (event.data.command === 'color_change') {
                let name = event.data.name;
                let color = event.data.color;
                let labelValue = event.data.labelValue;
                if (this._viewer.label.has(name)) {
                    color = color.replace('rgb(', '').replace(')', '');
                    let r = parseInt(color.split(',')[0]);
                    let g = parseInt(color.split(',')[1]);
                    let b = parseInt(color.split(',')[2]);
                    (this._viewer.label.get(name) as Reader).setColor(labelValue, [r, g, b]);
                    if (this._viewer.selected_label.includes(name)) {
                        this.drawCanvas();
                    }
                }
            }
        });
        window.addEventListener('resize', () => {
            this.create_window_slider(this._viewer.min_pixel, this._viewer.max_pixel, this._sliders.window[0], this._sliders.window[1]);
            this.drawCanvas();
        });

        this._vscode.postMessage({
            command: 'init'
        });
    };

    private create_window_slider(min: number, max: number, min_threshold: number, max_threshold: number) {
        // @ts-ignore
        let height = document.querySelector("#window>div[class=slider]").clientHeight * 0.8;
        // @ts-ignore
        window.postMessage({
            command: 'render_window_slider',
            min: min,
            max: max,
            min_threshold: min_threshold,
            max_threshold: max_threshold,
            height: height
        });
    }

    // 双线性插值法
    private bilinearInterpolation(srcImageData: any, destImageData: any, destWidth: number, destHeight: number) {
        const srcWidth = srcImageData.width;
        const srcHeight = srcImageData.height;
        // const destImageData = ctx.createImageData(destWidth, destHeight);
        
        const srcData = srcImageData.data;
        const destData = destImageData.data;

        const xRatio = srcWidth / destWidth;
        const yRatio = srcHeight / destHeight;

        for (let y = 0; y < destHeight; y++) {
            for (let x = 0; x < destWidth; x++) {
                const destIndex = (y * destWidth + x) * 4;
                
                const srcX = x * xRatio;
                const srcY = y * yRatio;

                const xFloor = Math.floor(srcX);
                const yFloor = Math.floor(srcY);
                const xCeil = Math.min(srcWidth - 1, Math.ceil(srcX));
                const yCeil = Math.min(srcHeight - 1, Math.ceil(srcY));

                const topLeftIndex = (yFloor * srcWidth + xFloor) * 4;
                const topRightIndex = (yFloor * srcWidth + xCeil) * 4;
                const bottomLeftIndex = (yCeil * srcWidth + xFloor) * 4;
                const bottomRightIndex = (yCeil * srcWidth + xCeil) * 4;

                for (let i = 0; i < 4; i++) {
                    const topLeft = srcData[topLeftIndex + i];
                    const topRight = srcData[topRightIndex + i];
                    const bottomLeft = srcData[bottomLeftIndex + i];
                    const bottomRight = srcData[bottomRightIndex + i];

                    const top = topLeft + (topRight - topLeft) * (srcX - xFloor);
                    const bottom = bottomLeft + (bottomRight - bottomLeft) * (srcX - xFloor);
                    const value = top + (bottom - top) * (srcY - yFloor);

                    destData[destIndex + i] = value;
                }
            }
        }

        return destImageData;
    }

    public drawCanvas() {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const data = document.getElementById('data') as HTMLElement;

        let rows: number = this._viewer.data.dims[0];
        let cols: number = this._viewer.data.dims[1];
        
        let scale = Math.min(data.clientWidth / cols, data.clientHeight / rows) * 0.95;
        canvas.width = Math.floor(cols * scale);
        canvas.height = Math.floor(rows * scale);
    
        let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        let canvasImageData = ctx.createImageData(cols, rows);
    
        for(let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let r = 0, g = 0, b = 0, flag = 0;
                for(let name of this._viewer.selected_label) {
                    let label = this._viewer.label.get(name) as Reader;
                    let labelValue = label.image[row][col];
                    if(labelValue === 0) {
                        continue;
                    }
                    flag += 1;
                    r += label.getColorByLabelValue(labelValue)[0] * this._label_alpha / this._viewer.selected_label.length;
                    g += label.getColorByLabelValue(labelValue)[1] * this._label_alpha / this._viewer.selected_label.length;
                    b += label.getColorByLabelValue(labelValue)[2] * this._label_alpha / this._viewer.selected_label.length;
                }
                let value = this._viewer.data.image[row][col];
                value = Math.min(Math.max(value, this._sliders.window[0]), this._sliders.window[1]);
                value = (value - this._sliders.window[0]) / (this._sliders.window[1] - this._sliders.window[0]) * 255;
                value = flag > 0 ? value * (1 - this._label_alpha) : value;
                canvasImageData.data[(row * cols + col) * 4] = Math.round(value + r);
                canvasImageData.data[(row * cols + col) * 4 + 1] = Math.round(value + g);
                canvasImageData.data[(row * cols + col) * 4 + 2] = Math.round(value + b);
                canvasImageData.data[(row * cols + col) * 4 + 3] = 0xFF;
            }
        }
        let scaleCanvasImageData = ctx.createImageData(canvas.width, canvas.height);
        scaleCanvasImageData = this.bilinearInterpolation(canvasImageData, scaleCanvasImageData, canvas.width, canvas.height);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(scaleCanvasImageData, 0, 0);
    }
}

// @ts-ignore
window.addEventListener('message', event => {
    if (event.data.command === 'ready') {
        new DicomController();
    }
});