import * as nifti from 'nifti-reader-js';
// @ts-ignore
import *  as layui from 'layui';

class NiftiType{
    private _niftiHeader: nifti.NIFTI1 | nifti.NIFTI2;
    private _niftiImage: ArrayBuffer;
    private _path: String;
    private _name: String;

    constructor(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, niftiImage: ArrayBuffer, path: String, name: String) {
        this._niftiHeader = niftiHeader;
        this._niftiImage = niftiImage;
        this._path = path;
        this._name = name;
    }

    public get niftiHeader() {
        return this._niftiHeader;
    }

    public get niftiImage() {
        return this._niftiImage;
    }

    public get path() {
        return this._path;
    }

    public get name() {
        return this._name;
    }

    public set name(name: String) {
        this._name = name;
    }
}

class NiftiViewer {
    private _data: NiftiType;
    private _label: Map<String, NiftiType> = new Map();
    private _typeData: any;
    private _max_pixel: number = 0;
    private _min_pixel: number = 0;

    constructor(data: NiftiType) {
        this._data = data;
        if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
            this._typeData = new Uint8Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
            this._typeData = new Int16Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
            this._typeData = new Int32Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
            this._typeData = new Float32Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
            this._typeData = new Float64Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
            this._typeData = new Int8Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
            this._typeData = new Uint16Array(this._data.niftiImage);
        } else if (this._data.niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
            this._typeData = new Uint32Array(this._data.niftiImage);
        } else {
            return;
        }
        this._max_pixel = this._typeData.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER);
        this._min_pixel = this._typeData.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER);
    }

    public get data() {
        return this._data;
    }

    public get label() {
        return this._label;
    }

    public get typeData() {
        return this._typeData;
    }

    public get max_pixel() {
        return this._max_pixel;
    }

    public get min_pixel() {
        return this._min_pixel;
    }

    public add_label(label: NiftiType) {
        let name = label.path.split('/').pop()?.replace('.nii.gz', '').replace('.nii', '') as String;
        name = this.generate_label_name(name);
        label.name = name;
        this._label.set(name, label);
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

function verifyNifti(data: Uint8Array, path: String) {
    let nii = nifti.Utils.toArrayBuffer(data);
    if (nifti.isCompressed(nii)) {
        nii = nifti.decompress(nii);
    }
    if (nifti.isNIFTI(nii)) {
        let header = nifti.readHeader(nii);
        if (header === null) {
            return null;
        }
        let label = nifti.readImage(header, nii);
        return new NiftiType(header, label, path, '');
    }
    return null;
}

// @ts-ignore
window.addEventListener('message', event => {
    if (event.data.command === 'ready') {
        init();
    }
});

function base64ToUint8Array(base64: any): Uint8Array{
    // @ts-ignore
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function init() {
    // @ts-ignore
    const vscode = acquireVsCodeApi();
    let niftiViewer: NiftiViewer;
    let sliders = {
        slice: 0,
        window: [0, 0]
    };
    // @ts-ignore
    const add_label_icon = document.getElementById('add_label_icon');
    
    add_label_icon.addEventListener('click', () => {
        vscode.postMessage({
            command: 'add_label'
        });
    });
    
    // 添加插件端传输数据的监听
    // @ts-ignore
    window.addEventListener('message', event => {
        if (event.data.command === 'init') {
            // 我也不知道为什么要加这一句，因为如果不加那么将HTML中的js部分会爆layui没定义的错误
            let temp = layui.slider;
            let data = base64ToUint8Array(event.data.data);
            let nifti_ = verifyNifti(data, event.data.path);
            if (nifti_ === null) {
                return;
            }
            niftiViewer = new NiftiViewer(nifti_);
            // @ts-ignore
            window.postMessage({
                command: 'render_slice_slider',
                min: 0,
                max: nifti_.niftiHeader.dims[3] - 1,
                value: Math.round(nifti_.niftiHeader.dims[3] / 2)
            });
            create_slice_slider(0, niftiViewer.data.niftiHeader.dims[3] - 1, Math.round(niftiViewer.data.niftiHeader.dims[3] / 2));

            create_window_slider(niftiViewer.min_pixel, niftiViewer.max_pixel, niftiViewer.min_pixel, niftiViewer.max_pixel);
            sliders.slice = Math.round(niftiViewer.data.niftiHeader.dims[3] / 2);
            sliders.window[0] = niftiViewer.min_pixel;
            sliders.window[1] = niftiViewer.max_pixel;
            update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
        }else if (event.data.command === 'add_label') {
            let nifti_ = verifyNifti(event.data.data, event.data.path);
            if (nifti_ === null) {
                return;
            }
            niftiViewer.add_label(nifti_);
            add_label(event.data.label_list,vscode);
        }else if (event.data.command === 'slice_change') {
            sliders.slice = event.data.value;
            update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
        }else if (event.data.command === 'window_change') {
            sliders.window[0] = event.data.min_threshold;
            sliders.window[1] = event.data.max_threshold;
            update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
        }
    });
    // @ts-ignore
    window.addEventListener('resize', () => {
        create_slice_slider(0, niftiViewer.data.niftiHeader.dims[3] - 1, sliders.slice);
        create_window_slider(niftiViewer.min_pixel, niftiViewer.max_pixel, sliders.window[0], sliders.window[1]);
        update_canvas(niftiViewer.data.niftiHeader, niftiViewer.typeData, sliders);
    });

    vscode.postMessage({
        command: 'init'
    });
}

function add_label(label_list: String[], vscode: any) {
    // @ts-ignore
    const labelList = document.getElementById('label_list');
    label_list.forEach(element => {
        // @ts-ignore
        let div = document.createElement('div');
        // @ts-ignore
        let i = document.createElement('i');

        div.className = 'label';
        div.setAttribute('name', element);
        i.className = 'layui-icon layui-icon-close delete_label';
        div.innerText = element;
        i.addEventListener('click', () => {
            div.remove();
            vscode.postMessage({
                command: 'delete_label',
                label_name: element
            });
        });
        div.appendChild(i);
        labelList.appendChild(div);
    });
}

function create_slice_slider(min: number, max: number, value: number) {
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

function create_window_slider(min: number, max: number, min_threshold: number, max_threshold: number) {
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

function update_canvas(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, typeData: any, sliders: any) {
    // @ts-ignore
    const canvas = document.getElementById('canvas');
    readNIFTI(niftiHeader, typeData, canvas, sliders.slice);
}

function readNIFTI(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, typeData: any, canvas: any, slice: any) {

    // set up slider
    var slices = niftiHeader.dims[3];

    // draw slice
    drawCanvas(canvas, slice, niftiHeader, typeData);
}

function drawCanvas(canvas: any, slice: number, niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, typeData: any) {
    // get nifti dimensions
    var cols = niftiHeader.dims[1];
    var rows = niftiHeader.dims[2];

    // set canvas dimensions to nifti slice dimensions
    canvas.width = cols;
    canvas.height = rows;

    // make canvas image data
    var ctx = canvas.getContext("2d");
    var canvasImageData = ctx.createImageData(canvas.width, canvas.height);

    // convert raw data to typed array based on nifti datatype

    // offset to specified slice
    var sliceSize = cols * rows;
    var sliceOffset = sliceSize * slice;

    // draw pixels
    for (var row = 0; row < rows; row++) {
        var rowOffset = row * cols;

        for (var col = 0; col < cols; col++) {
            var offset = sliceOffset + rowOffset + col;
            var value = typeData[offset];

            canvasImageData.data[(rowOffset + col) * 4] = value & 0xFF;
            canvasImageData.data[(rowOffset + col) * 4 + 1] = value & 0xFF;
            canvasImageData.data[(rowOffset + col) * 4 + 2] = value & 0xFF;
            canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;
        }
    }
    ctx.putImageData(canvasImageData, 0, 0);
    console.log("绘制完成");
}