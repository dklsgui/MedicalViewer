import * as nifti from 'nifti-reader-js';
import { base64ToUint8Array } from '../../utils/util';
// @ts-ignore
import *  as layui from 'layui';

class NiftiType{
    private _niftiHeader: nifti.NIFTI1 | nifti.NIFTI2;
    private _niftiImage: any;
    private _data_type: String;
    private _path: String;
    private _name: String;
    private _color: number[];

    public static verifyNifti(data: Uint8Array, path: String) {
        let nii = nifti.Utils.toArrayBuffer(data);
        if (nifti.isCompressed(nii)) {
            nii = nifti.decompress(nii);
        }
        if (nifti.isNIFTI(nii)) {
            let header = nifti.readHeader(nii);
            if (header === null) {
                return null;
            }
            let image = nifti.readImage(header, nii);
            let data_type: String;
            if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
                image = new Uint8Array(image);
                data_type = 'Uint8';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
                image = new Int16Array(image);
                data_type = 'Int16';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
                image = new Int32Array(image);
                data_type = 'Int32';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
                image = new Float32Array(image);
                data_type = 'Float32';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
                image = new Float64Array(image);
                data_type = 'Float64';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
                image = new Int8Array(image);
                data_type = 'Int8';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
                image = new Uint16Array(image);
                data_type = 'Uint16';
            } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
                image = new Uint32Array(image);
                data_type = 'Uint32';
            } else {
                return null;
            }
            return new NiftiType(header, image, data_type,path, '');
        }
        return null;
    }

    constructor(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, niftiImage: any, data_type:String, path: String, name: String, color: number[] = [0, 0, 0]) {
        this._niftiHeader = niftiHeader;
        this._niftiImage = niftiImage;
        this._data_type = data_type;
        this._path = path;
        this._name = name;
        this._color = color;
    }

    public get niftiHeader() {
        return this._niftiHeader;
    }

    public get niftiImage() {
        return this._niftiImage;
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

class NiftiViewer {
    private _data: NiftiType;
    private _label: Map<String, NiftiType> = new Map();
    private _max_pixel: number = 0;
    private _min_pixel: number = 0;
    private _selected_label: String[] = [];

    constructor(data: NiftiType) {
        this._data = data;
        // console.log("dims:"+this._data.niftiHeader.dims); // [3, 256, 256, 150, 1, 1, 1, 1]
        this._max_pixel = this._data.niftiImage.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER);
        this._min_pixel = this._data.niftiImage.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER);
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

    public add_label(label: NiftiType): String {
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
    private _niftiViewer: NiftiViewer;
    private  _label_alpha: number = 0.4;
    private _axis: number = 3;
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
        
        // @ts-ignore
        const axis_button = document.querySelectorAll('#axis>div>button');
        for (let i = 0; i < axis_button.length; i++) {
            axis_button[i].addEventListener('click', () => {
                if (axis_button[i].getAttribute('is_selected') === 'true') {
                    return;
                }else {
                    axis_button[this._axis - 1].setAttribute('is_selected', 'false');
                    axis_button[i].setAttribute('is_selected', 'true');
                    this._axis = i + 1;
                    this.create_slice_slider(0, this._niftiViewer.data.niftiHeader.dims[this._axis] - 1, Math.round(this._niftiViewer.data.niftiHeader.dims[this._axis] / 2));
                    this._sliders.slice = Math.round(this._niftiViewer.data.niftiHeader.dims[this._axis] / 2);
                    this.drawCanvas();
                }
            });
        }
        // 添加插件端传输数据的监听
        // @ts-ignore
        window.addEventListener('message', event => {
            if (event.data.command === 'init') {
                // 我也不知道为什么要加这一句，因为如果不加那么将HTML中的js部分会爆layui没定义的错误，或许bug+bug=normal~~
                let temp = layui.slider;
                let data = base64ToUint8Array(event.data.data);
                let nifti_ = NiftiType.verifyNifti(data, event.data.path);
                if (nifti_ === null) {
                    return;
                }
                this._niftiViewer = new NiftiViewer(nifti_);
                let dims = nifti_.niftiHeader.dims;

                // @ts-ignore
                document.getElementById('dimensions').innerText = dims[0] + "D (" + dims.slice(1,dims[0] + 1).join(',') + ")";
                // @ts-ignore
                document.getElementById('spacing').innerText = nifti_.niftiHeader.pixDims.slice(1,dims[0] + 1).join(' ');
                // @ts-ignore
                document.getElementById('datatype').innerText = this._niftiViewer.data.data_type;

                this._label_alpha = event.data.alpha;
                let min_threshold = event.data.level - event.data.width / 2;
                let max_threshold = event.data.level + event.data.width / 2;

                min_threshold = Math.max(min_threshold, this._niftiViewer.min_pixel);
                max_threshold = Math.min(max_threshold, this._niftiViewer.max_pixel);

                this.create_slice_slider(0, this._niftiViewer.data.niftiHeader.dims[3] - 1, Math.round(this._niftiViewer.data.niftiHeader.dims[3] / 2));
                this.create_window_slider(this._niftiViewer.min_pixel, this._niftiViewer.max_pixel, min_threshold, max_threshold);

                this._sliders.slice = Math.round(this._niftiViewer.data.niftiHeader.dims[3] / 2);
                this._sliders.window[0] = min_threshold;
                this._sliders.window[1] = max_threshold;
                this.drawCanvas();
            }else if (event.data.command === 'add_label') {
                let data = base64ToUint8Array(event.data.data);
                let path = event.data.path;
                let nifti_ = NiftiType.verifyNifti(data, path);
                if (nifti_ === null) {
                    return;
                }
                let name = this._niftiViewer.add_label(nifti_);
                this._niftiViewer.selected_label.push(name);
                this.add_label(name,path);
                this.drawCanvas();
            }else if (event.data.command === 'slice_change') {
                this._sliders.slice = event.data.value;
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
                if (this._niftiViewer.label.has(name)) {
                    color = color.replace('rgb(', '').replace(')', '');
                    let r = parseInt(color.split(',')[0]);
                    let g = parseInt(color.split(',')[1]);
                    let b = parseInt(color.split(',')[2]);
                    (this._niftiViewer.label.get(name) as NiftiType).color = [r, g, b];
                    if (this._niftiViewer.selected_label.includes(name)) {
                        this.drawCanvas();
                    }
                }
            }
        });
        // @ts-ignore
        window.addEventListener('resize', () => {
            this.create_slice_slider(0, this._niftiViewer.data.niftiHeader.dims[3] - 1, this._sliders.slice);
            this.create_window_slider(this._niftiViewer.min_pixel, this._niftiViewer.max_pixel, this._sliders.window[0], this._sliders.window[1]);
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

        let color = this._niftiViewer.label.get(name)?.color.join(',') as String;

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
                this._niftiViewer.selected_label.push(name);
            } else {
                span.setAttribute('is_selected', "false");
                div.style.backgroundColor = 'rgb(0, 0, 255)';
                this._niftiViewer.selected_label = this._niftiViewer.selected_label.filter((value) => value !== name);
            }
            this.drawCanvas();
        });
        i.className = 'layui-icon layui-icon-close delete_label';
        i.addEventListener('click', () => {
            div.remove();
            if (this._niftiViewer.delete_label(name)) {
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

    private create_slice_slider(min: number, max: number, value: number) {
        // @ts-ignore
        let height = document.querySelector("#axis>div[class=slider]").clientHeight * 0.8;
        // @ts-ignore
        window.postMessage({
            command: 'render_slice_slider',
            min: min,
            max: max,
            value: value,
            height: height
        });
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
    
    private calculate_coordinate(dims: number[],row: number, col: number) {
        if (this._axis === 3) {
            return col + dims[0] * row + dims[0] * dims[1] * this._sliders.slice;
            // return row * dims[0] + col + dims[0] * dims[0] * this._sliders.slice;
        } else if (this._axis === 2) {
            // return row * dims[0] + this._sliders.slice + dims[0] * dims[1] * col;
            return col + dims[0] * this._sliders.slice + dims[0] * dims[1] * (dims[2] - row - 1);
        } else if (this._axis === 1) {
            // return this._sliders.slice * dims[0] + col + dims[0] * dims[1] * row;
            return this._sliders.slice + dims[0] * col + dims[0] * dims[1] * (dims[2] - row - 1);
        }
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

        let cols: number = 0;
        let rows: number = 0;
        let dims = this._niftiViewer.data.niftiHeader.dims;
        dims = dims.slice(1, dims[0] + 1);
        if (this._axis === 3) {
            cols = this._niftiViewer.data.niftiHeader.dims[1];
            rows = this._niftiViewer.data.niftiHeader.dims[2];
        } else if (this._axis === 2) {
            cols = this._niftiViewer.data.niftiHeader.dims[1];
            rows = this._niftiViewer.data.niftiHeader.dims[3];
        } else if (this._axis === 1) {
            cols = this._niftiViewer.data.niftiHeader.dims[2];
            rows = this._niftiViewer.data.niftiHeader.dims[3];
        }
        
        // canvas.width = cols;
        // canvas.height = rows;
        let scale = Math.min(data.clientWidth / cols, data.clientHeight / rows) * 0.95;
        canvas.width = Math.floor(cols * scale);
        canvas.height = Math.floor(rows * scale);
    
        let ctx = canvas.getContext("2d");
        let canvasImageData = ctx.createImageData(cols, rows);
    
        for (let row = 0; row < rows; row++) {
            let rowOffset = row * cols;
            for (let col = 0; col < cols; col++) {
                let offset = this.calculate_coordinate(dims, row, col) as number;
                let value = this._niftiViewer.data.niftiImage[offset];
                let r = 0, g = 0,b = 0, flag = 0;
                for (let name of this._niftiViewer.selected_label) {
                    let label = this._niftiViewer.label.get(name) as NiftiType;
                    let labelValue = label.niftiImage[offset] > 0 ? 1 : 0;
                    if(labelValue === 0) {
                        continue;
                    }
                    flag += 1;
                    r += label.color[0] * labelValue * this._label_alpha / this._niftiViewer.selected_label
                    .length;
                    g += label.color[1] * labelValue * this._label_alpha / this._niftiViewer.selected_label
                    .length;
                    b += label.color[2] * labelValue * this._label_alpha / this._niftiViewer.selected_label
                    .length;
                }
                value = Math.min(Math.max(value, this._sliders.window[0]), this._sliders.window[1]);
                value = (value - this._sliders.window[0]) / (this._sliders.window[1] - this._sliders.window[0]) * 255;
                value = flag > 0 ? value * (1 - this._label_alpha) : value;
    
                canvasImageData.data[(rowOffset + col) * 4] = Math.round(value + r);
                canvasImageData.data[(rowOffset + col) * 4 + 1] = Math.round(value + g);
                canvasImageData.data[(rowOffset + col) * 4 + 2] = Math.round(value + b);
                canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;
            }
        }
        let scaleCanvasImageData = ctx.createImageData(canvas.width, canvas.height);
        scaleCanvasImageData = this.bilinearInterpolation(canvasImageData, scaleCanvasImageData, canvas.width, canvas.height);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(scaleCanvasImageData, 0, 0);
        // ctx.putImageData(canvasImageData, 0, 0);
    }
}

// @ts-ignore
window.addEventListener('message', event => {
    if (event.data.command === 'ready') {
        new Controller();
    }
});