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
    private readonly _label_alpha = 0.3;
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

                this.create_slice_slider(0, this._niftiViewer.data.niftiHeader.dims[3] - 1, Math.round(this._niftiViewer.data.niftiHeader.dims[3] / 2));
                this.create_window_slider(this._niftiViewer.min_pixel, this._niftiViewer.max_pixel, this._niftiViewer.min_pixel, this._niftiViewer.max_pixel);

                this._sliders.slice = Math.round(this._niftiViewer.data.niftiHeader.dims[3] / 2);
                this._sliders.window[0] = this._niftiViewer.min_pixel;
                this._sliders.window[1] = this._niftiViewer.max_pixel;

                this.drawCanvas();
            }else if (event.data.command === 'add_label') {
                let data = base64ToUint8Array(event.data.data);
                let path = event.data.path;
                let nifti_ = NiftiType.verifyNifti(data, path);
                if (nifti_ === null) {
                    return;
                }
                let name = this._niftiViewer.add_label(nifti_);
                this.add_label(name,path);
            }else if (event.data.command === 'slice_change') {
                this._sliders.slice = event.data.value;
                this.drawCanvas();
            }else if (event.data.command === 'window_change') {
                this._sliders.window[0] = event.data.min_threshold;
                this._sliders.window[1] = event.data.max_threshold;
                this.drawCanvas();
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
        let i = document.createElement('i');

        div.className = 'label';
        div.setAttribute('title', path);
        span.innerText = name;
        span.setAttribute('is_selected', 'false');
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
        // div.innerText = name;
        i.addEventListener('click', () => {
            div.remove();
            if (this._niftiViewer.delete_label(name)) {
                this.drawCanvas();
            }
        });
        div.appendChild(span);
        div.appendChild(i);
        labelList.appendChild(div);
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
    
    private drawCanvas() {
        // @ts-ignore
        const canvas = document.getElementById('canvas');
        // get nifti dimensions
        let cols = this._niftiViewer.data.niftiHeader.dims[1];
        let rows = this._niftiViewer.data.niftiHeader.dims[2];
    
        // set canvas dimensions to nifti slice dimensions
        canvas.width = cols;
        canvas.height = rows;
    
        // make canvas image data
        let ctx = canvas.getContext("2d");
        let canvasImageData = ctx.createImageData(canvas.width, canvas.height);
    
        // convert raw data to typed array based on nifti datatype
    
        // offset to specified slice
        let sliceSize = cols * rows;
        let sliceOffset = sliceSize * this._sliders.slice;
    
        // draw pixels
        for (let row = 0; row < rows; row++) {
            let rowOffset = row * cols;
    
            for (let col = 0; col < cols; col++) {
                let offset = sliceOffset + rowOffset + col;
                let value = this._niftiViewer.data.niftiImage[offset];
                let r = 0, g = 0,b = 0;
                for (let name of this._niftiViewer.selected_label) {
                    let label = this._niftiViewer.label.get(name) as NiftiType;
                    let labelValue = label.niftiImage[offset];
                    r += label.color[0] * labelValue * this._label_alpha / this._niftiViewer.selected_label
                    .length;
                    g += label.color[1] * labelValue * this._label_alpha / this._niftiViewer.selected_label
                    .length;
                    b += label.color[2] * labelValue * this._label_alpha / this._niftiViewer.selected_label
                    .length;
                }
                value = Math.min(Math.max(value, this._sliders.window[0]), this._sliders.window[1]);
                value = (value - this._sliders.window[0]) / (this._sliders.window[1] - this._sliders.window[0]) * 255;
                value = value * (1 - this._label_alpha);

    
                canvasImageData.data[(rowOffset + col) * 4] = Math.round(value + r);
                canvasImageData.data[(rowOffset + col) * 4 + 1] = Math.round(value + g);
                canvasImageData.data[(rowOffset + col) * 4 + 2] = Math.round(value + b);
                canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;
            }
        }
        ctx.putImageData(canvasImageData, 0, 0);
        console.log("绘制完成");
    }
}

// @ts-ignore
window.addEventListener('message', event => {
    if (event.data.command === 'ready') {
        new Controller();
    }
});

// function base64ToUint8Array(base64: any): Uint8Array{
//     // @ts-ignore
//     const binaryString = window.atob(base64);
//     const len = binaryString.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) {
//         bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes;
// }

// function init() {
//     // @ts-ignore
//     const vscode = acquireVsCodeApi();
//     let niftiViewer: NiftiViewer;
//     let sliders = {
//         slice: 0,
//         window: [0, 0]
//     };
//     // @ts-ignore
//     const add_label_icon = document.getElementById('add_label_icon');
    
//     add_label_icon.addEventListener('click', () => {
//         vscode.postMessage({
//             command: 'add_label'
//         });
//     });
    
//     // 添加插件端传输数据的监听
//     // @ts-ignore
//     window.addEventListener('message', event => {
//         if (event.data.command === 'init') {
//             // 我也不知道为什么要加这一句，因为如果不加那么将HTML中的js部分会爆layui没定义的错误
//             let temp = layui.slider;
//             let data = base64ToUint8Array(event.data.data);
//             let nifti_ = NiftiType.verifyNifti(data, event.data.path);
//             if (nifti_ === null) {
//                 return;
//             }
//             niftiViewer = new NiftiViewer(nifti_);
//             // @ts-ignore
//             window.postMessage({
//                 command: 'render_slice_slider',
//                 min: 0,
//                 max: nifti_.niftiHeader.dims[3] - 1,
//                 value: Math.round(nifti_.niftiHeader.dims[3] / 2)
//             });
//             create_slice_slider(0, niftiViewer.data.niftiHeader.dims[3] - 1, Math.round(niftiViewer.data.niftiHeader.dims[3] / 2));

//             create_window_slider(niftiViewer.min_pixel, niftiViewer.max_pixel, niftiViewer.min_pixel, niftiViewer.max_pixel);
//             sliders.slice = Math.round(niftiViewer.data.niftiHeader.dims[3] / 2);
//             sliders.window[0] = niftiViewer.min_pixel;
//             sliders.window[1] = niftiViewer.max_pixel;
//             update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
//         }else if (event.data.command === 'add_label') {
//             let nifti_ = NiftiType.verifyNifti(event.data.data, event.data.path);
//             if (nifti_ === null) {
//                 return;
//             }
//             niftiViewer.add_label(nifti_);
//             add_label(event.data.label_list,vscode);
//         }else if (event.data.command === 'slice_change') {
//             sliders.slice = event.data.value;
//             update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
//         }else if (event.data.command === 'window_change') {
//             sliders.window[0] = event.data.min_threshold;
//             sliders.window[1] = event.data.max_threshold;
//             update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
//         }
//     });
//     // @ts-ignore
//     window.addEventListener('resize', () => {
//         create_slice_slider(0, niftiViewer.data.niftiHeader.dims[3] - 1, sliders.slice);
//         create_window_slider(niftiViewer.min_pixel, niftiViewer.max_pixel, sliders.window[0], sliders.window[1]);
//         update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
//     });

//     vscode.postMessage({
//         command: 'init'
//     });
// }

// function add_label(label_list: String[], vscode: any) {
//     // @ts-ignore
//     const labelList = document.getElementById('label_list');
//     label_list.forEach(element => {
//         // @ts-ignore
//         let div = document.createElement('div');
//         // @ts-ignore
//         let i = document.createElement('i');

//         div.className = 'label';
//         div.setAttribute('name', element);
//         i.className = 'layui-icon layui-icon-close delete_label';
//         div.innerText = element;
//         i.addEventListener('click', () => {
//             div.remove();
//             vscode.postMessage({
//                 command: 'delete_label',
//                 label_name: element
//             });
//         });
//         div.appendChild(i);
//         labelList.appendChild(div);
//     });
// }

// function create_slice_slider(min: number, max: number, value: number) {
//     // @ts-ignore
//     let height = document.querySelector("#axis>div[class=slider]").clientHeight * 0.8;
//     // @ts-ignore
//     window.postMessage({
//         command: 'render_slice_slider',
//         min: min,
//         max: max,
//         value: value,
//         height: height
//     });
// }

// function create_window_slider(min: number, max: number, min_threshold: number, max_threshold: number) {
//     // @ts-ignore
//     let height = document.querySelector("#window>div[class=slider]").clientHeight * 0.8;
//     // @ts-ignore
//     window.postMessage({
//         command: 'render_window_slider',
//         min: min,
//         max: max,
//         min_threshold: min_threshold,
//         max_threshold: max_threshold,
//         height: height
//     });
// }

// function update_canvas(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, typeData: any, sliders: any) {
//     // @ts-ignore
//     const canvas = document.getElementById('canvas');
//     readNIFTI(niftiHeader, typeData, canvas, sliders.slice);
// }

// function readNIFTI(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, typeData: any, canvas: any, slice: any) {

//     // set up slider
//     var slices = niftiHeader.dims[3];

//     // draw slice
//     drawCanvas(canvas, slice, niftiHeader, typeData);
// }

// function drawCanvas(canvas: any, slice: number, niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, typeData: any) {
//     // get nifti dimensions
//     var cols = niftiHeader.dims[1];
//     var rows = niftiHeader.dims[2];

//     // set canvas dimensions to nifti slice dimensions
//     canvas.width = cols;
//     canvas.height = rows;

//     // make canvas image data
//     var ctx = canvas.getContext("2d");
//     var canvasImageData = ctx.createImageData(canvas.width, canvas.height);

//     // convert raw data to typed array based on nifti datatype

//     // offset to specified slice
//     var sliceSize = cols * rows;
//     var sliceOffset = sliceSize * slice;

//     // draw pixels
//     for (var row = 0; row < rows; row++) {
//         var rowOffset = row * cols;

//         for (var col = 0; col < cols; col++) {
//             var offset = sliceOffset + rowOffset + col;
//             var value = typeData[offset];

//             canvasImageData.data[(rowOffset + col) * 4] = value & 0xFF;
//             canvasImageData.data[(rowOffset + col) * 4 + 1] = value & 0xFF;
//             canvasImageData.data[(rowOffset + col) * 4 + 2] = value & 0xFF;
//             canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;
//         }
//     }
//     ctx.putImageData(canvasImageData, 0, 0);
//     console.log("绘制完成");
// }