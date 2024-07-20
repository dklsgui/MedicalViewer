import * as dicomParser from 'dicom-parser';
import { base64ToUint8Array } from '../../utils/util';
// @ts-ignore
import *  as layui from 'layui';

class DicomType{
    private _data_dicom: dicomParser.DataSet;
    private _pixel_data: any;
    private _rows: number;
    private _cols: number;
    private _path: String;
    private _name: String;
    private _color: number[];
    private _data_type: String;

    public static verifyDicom(data: Uint8Array, path: String) {
        try{
            let data_dicom =  dicomParser.parseDicom(data);
            let dataType;
            const bitsAllocated = data_dicom.uint16('x00280100'); // Bits Allocated (0028,0100)
            const pixelRepresentation = data_dicom.uint16('x00280103'); // Pixel Representation (0028,0103)
            if (bitsAllocated === 8) {
                dataType = pixelRepresentation === 0 ? 'Uint8' : 'Int8';
            } else if (bitsAllocated === 16) {
                dataType = pixelRepresentation === 0 ? 'Uint16' : 'Int16';
            } else if (bitsAllocated === 32) {
                // 32 位可能是浮点数
                dataType = pixelRepresentation === 0 ? 'Float32' : 'Int32';
            } else {
                return null;
            }
            let pixel_data_element = data_dicom.elements.x7fe00010;
            let pixel_data = null;
            if(dataType === 'Uint8') {
                pixel_data = new Uint8Array(data.buffer, pixel_data_element.dataOffset, pixel_data_element.length);
            }else if(dataType === 'Int8') {
                pixel_data = new Int8Array(data.buffer, pixel_data_element.dataOffset, pixel_data_element.length);
            }else if(dataType === 'Uint16') {
                pixel_data = new Uint16Array(data.buffer, pixel_data_element.dataOffset, pixel_data_element.length / 2);
            }else if(dataType === 'Int16') {
                pixel_data = new Int16Array(data.buffer, pixel_data_element.dataOffset, pixel_data_element.length / 2);
            }else if(dataType === 'Float32') {
                pixel_data = new Float32Array(data.buffer, pixel_data_element.dataOffset, pixel_data_element.length / 4);
            }else if(dataType === 'Int32') {
                pixel_data = new Int32Array(data.buffer, pixel_data_element.dataOffset, pixel_data_element.length / 4);
            }
            let rows = data_dicom.uint16('x00280010');
            let cols = data_dicom.uint16('x00280011');
            return new DicomType(data_dicom, pixel_data, dataType, path, path.split('/').pop()?.replace('.dcm', '') as String, rows as number, cols as number);
        } catch (e) {
            return null;
        }
    }

    constructor(data_dicom: dicomParser.DataSet, pixel_data: any, data_type: String, path: String, name: String, rows: number, cols: number,color: number[] = [0, 0, 0]) {
        this._data_dicom = data_dicom;
        this._pixel_data = pixel_data;
        this._path = path;
        this._name = name;
        this._rows = rows;
        this._cols = cols;
        this._color = color;
        this._data_type = data_type;
    }

    public get data_dicom() {
        return this._data_dicom;
    }

    public get pixel_data() {
        return this._pixel_data;
    }

    public get data_type() {
        return this._data_type;
    }

    public get path() {
        return this._path;
    }

    public get name() {
        return this._name;
    }

    public get rows() {
        return this._rows;
    }

    public get cols() {
        return this._cols;
    }

    public get color() {
        return this._color;
    }

    public set name(name: String) {
        this._name = name;
    }

    public set color(color: number[]) {
        this._color = color;
    }
}

class DicomViewer {
    private _data: DicomType;
    private _label: Map<String, DicomType> = new Map();
    private _max_pixel: number = 0;
    private _min_pixel: number = 0;
    private _selected_label: String[] = [];

    constructor(data: DicomType) {
        this._data = data;
        this._max_pixel = this._data.pixel_data.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER);
        this._min_pixel = this._data.pixel_data.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER);
    }

    public get data() {
        return this._data;
    }

    public get label() {
        return this._label;
    }

    public get max_pixel() {
        return this._max_pixel;
    }

    public get min_pixel() {
        return this._min_pixel;
    }

    public get selected_label() {
        return this._selected_label;
    }

    public set selected_label(selected_label: String[]) {
        this._selected_label = selected_label;
    }

    public add_label(label: DicomType): String {
        label.color = this.generate_color_for_label();
        let name = label.path.split('/').pop()?.replace('.nii.gz', '').replace('.nii', '') as String;
        name = this.generate_label_name(name);
        label.name = name;
        this._label.set(name, label);
        return name;
    }

    public delete_label(name: String): boolean {
        let length = this._selected_label.length;
        this._selected_label = this._selected_label.filter((value) => value !== name);
        this._label.delete(name);
        return length !== this._selected_label.length;
    }

    public generate_color_for_label(): number[]{
        while (true) {
            let r = Math.floor(Math.random() * 256); //随机生成256以内r值
            let g = Math.floor(Math.random() * 256); //随机生成256以内g值
            let b = Math.floor(Math.random() * 256); //随机生成256以内b值
            let color = [r, g, b];
            if (Array.from(this._label.values()).every((value) => value.color !== color)) {
                return color;
            }
        }
    }

    private generate_label_name(name: String) {
        let label_name = name;
        let temp_label_name = label_name;
        let count = 1;
        while (this._label.has(temp_label_name)) {
            temp_label_name = label_name + "_" + String(count);
            count++;
        }
        return temp_label_name;
    }
}

class Controller {
    private _vscode: any;
    // @ts-ignore
    private _dicomViewer: DicomViewer;
    private _label_alpha: number = 0.4;
    private _sliders = {
        slice: 0,
        window: [0, 0]
    };

    constructor() {
        // @ts-ignore
        this._vscode = acquireVsCodeApi();
        // @ts-ignore
        const add_label_icon = document.getElementById('add_label_icon');
        
        add_label_icon.addEventListener('click', () => {
            this._vscode.postMessage({
                command: 'show_label_dialog'
            });
        });
        
        // 添加插件端传输数据的监听
        // @ts-ignore
        window.addEventListener('message', event => {
            if (event.data.command === 'init') {
                // 我也不知道为什么要加这一句，因为如果不加那么将HTML中的js部分会爆layui没定义的错误，或许bug+bug=normal~~
                let temp = layui.slider;
                let data = base64ToUint8Array(event.data.data);
                let dicom_ = DicomType.verifyDicom(data, event.data.path);
                if (dicom_ === null) {
                    return;
                }
                this._dicomViewer = new DicomViewer(dicom_);

                // @ts-ignore
                document.getElementById('dimensions').innerText = "2D (" + [this._dicomViewer.data.data_dicom.uint16('x00280010'), this._dicomViewer.data.data_dicom.uint16('x00280011')].join(',') + ")";
                // @ts-ignore
                document.getElementById('datatype').innerText = this._dicomViewer.data.data_type;

                this._label_alpha = event.data.alpha;
                let min_threshold = event.data.level - event.data.width / 2;
                let max_threshold = event.data.level + event.data.width / 2;

                min_threshold = Math.max(min_threshold, this._dicomViewer.min_pixel);
                max_threshold = Math.min(max_threshold, this._dicomViewer.max_pixel);
                
                this.create_window_slider(this._dicomViewer.min_pixel, this._dicomViewer.max_pixel, min_threshold, max_threshold);

                this._sliders.window[0] = min_threshold;
                this._sliders.window[1] = max_threshold;
                this.drawCanvas();
            }else if (event.data.command === 'add_label') {
                let data = base64ToUint8Array(event.data.data);
                let path = event.data.path;
                let dicom_ = DicomType.verifyDicom(data, path);
                if (dicom_ === null) {
                    return;
                }
                let name = this._dicomViewer.add_label(dicom_);
                this._dicomViewer.selected_label.push(name);
                this.add_label(name,path);
                this.drawCanvas();
            }else if (event.data.command === 'window_change') {
                this._sliders.window[0] = event.data.min_threshold;
                this._sliders.window[1] = event.data.max_threshold;
                this.drawCanvas();
            }else if (event.data.command === 'color_change') {
                let name = event.data.name;
                let color = event.data.color;
                // @ts-ignore
                document.querySelector(`div[name="${name}"]`).style.backgroundColor = color;
                if (this._dicomViewer.label.has(name)) {
                    color = color.replace('rgb(', '').replace(')', '');
                    let r = parseInt(color.split(',')[0]);
                    let g = parseInt(color.split(',')[1]);
                    let b = parseInt(color.split(',')[2]);
                    (this._dicomViewer.label.get(name) as DicomType).color = [r, g, b];
                    if (this._dicomViewer.selected_label.includes(name)) {
                        this.drawCanvas();
                    }
                }
            }
        });
        // @ts-ignore
        window.addEventListener('resize', () => {
            this.create_window_slider(this._dicomViewer.min_pixel, this._dicomViewer.max_pixel, this._sliders.window[0], this._sliders.window[1]);
            this.drawCanvas();
        });

        this._vscode.postMessage({
            command: 'init'
        });
    };

    private add_label(name: String, path: String) {
        // @ts-ignore
        const labelList = document.getElementById('label_list');
        // @ts-ignore
        let div = document.createElement('div');
        // @ts-ignore
        let span = document.createElement('span');
        // @ts-ignore
        let color_select = document.createElement('div');
        // @ts-ignore
        let i = document.createElement('i');

        let color = this._dicomViewer.label.get(name)?.color.join(',') as String;

        div.className = 'label';
        div.setAttribute('title', path);
        div.style.backgroundColor = 'red';

        color_select.className = 'color_select';
        color_select.setAttribute('name', name);
        color_select.style.backgroundColor = 'rgb(' + color + ')';
        color_select.addEventListener('click', () => {
            // @ts-ignore
            document.querySelector(`div[name="${name}"]`).children[0].click();
        });

        span.className = 'label_name';
        span.innerText = name;
        span.setAttribute('is_selected', 'true');
        span.style.userSelect = 'none';
        span.addEventListener('click', () => {
            if (span.getAttribute('is_selected') === 'false') {
                span.setAttribute('is_selected', "true");
                div.style.backgroundColor = 'red';
                this._dicomViewer.selected_label.push(name);
            } else {
                span.setAttribute('is_selected', "false");
                div.style.backgroundColor = 'rgb(0, 0, 255)';
                this._dicomViewer.selected_label = this._dicomViewer.selected_label.filter((value) => value !== name);
            }
            this.drawCanvas();
        });
        i.className = 'layui-icon layui-icon-close delete_label';
        i.addEventListener('click', () => {
            div.remove();
            if (this._dicomViewer.delete_label(name)) {
                this.drawCanvas();
            }
        });
        div.appendChild(color_select);
        div.appendChild(span);
        div.appendChild(i);
        labelList.appendChild(div);
        // @ts-ignore
        window.postMessage({
            command: 'render_colorpicker',
            elem: `div[name="${name}"]`,
            color: color,
            name: name
        }); // 重新渲染颜色选择器
    }

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

    private drawCanvas() {
        // @ts-ignore
        const canvas = document.getElementById('canvas');
        // @ts-ignore
        const data = document.getElementById('data');

        let cols: number = this._dicomViewer.data.cols;
        let rows: number = this._dicomViewer.data.rows;
        
        let scale = Math.min(data.clientWidth / cols, data.clientHeight / rows) * 0.95;
        canvas.width = Math.floor(cols * scale);
        canvas.height = Math.floor(rows * scale);
    
        let ctx = canvas.getContext("2d");
        let canvasImageData = ctx.createImageData(cols, rows);
    
        for(let i = 0; i < this._dicomViewer.data.pixel_data.length; i++) {
            let r = 0, g = 0, b = 0;
            for(let name of this._dicomViewer.selected_label) {
                let label = this._dicomViewer.label.get(name) as DicomType;
                let labelValue = label.pixel_data[i];
                r += label.color[0] * labelValue * this._label_alpha / this._dicomViewer.selected_label.length;
                g += label.color[1] * labelValue * this._label_alpha / this._dicomViewer.selected_label.length;
                b += label.color[2] * labelValue * this._label_alpha / this._dicomViewer.selected_label.length;
            }
            let value = this._dicomViewer.data.pixel_data[i];
            value = Math.min(Math.max(value, this._sliders.window[0]), this._sliders.window[1]);
            value = (value - this._sliders.window[0]) / (this._sliders.window[1] - this._sliders.window[0]) * 255;
            value = value * (1 - this._label_alpha);
            canvasImageData.data[i * 4] = Math.round(value + r);
            canvasImageData.data[i * 4 + 1] = Math.round(value + g);
            canvasImageData.data[i * 4 + 2] = Math.round(value + b);
            canvasImageData.data[i * 4 + 3] = 0xFF;
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
        new Controller();
    }
});