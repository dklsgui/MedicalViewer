import * as nifti from 'nifti-reader-js';
// @ts-ignore
import * as layui from 'layui';

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

    constructor(data: NiftiType) {
        this._data = data;
    }

    public get data() {
        return this._data;
    }

    public get label() {
        return this._label;
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

function init() {
    // @ts-ignore
    const vscode = acquireVsCodeApi();
    var niftiViewer: NiftiViewer;

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
            let nifti_ = verifyNifti(event.data.data, event.data.path);
            if (nifti_ === null) {
                return;
            }
            niftiViewer = new NiftiViewer(nifti_);
            console.log("开始绘制");
            update_canvas(niftiViewer.data.niftiHeader, niftiViewer.data.niftiImage);
        }else if (event.data.command === 'add_label') {
            let nifti_ = verifyNifti(event.data.data, event.data.path);
            if (nifti_ === null) {
                return;
            }
            niftiViewer.add_label(nifti_);
            add_label(event.data.label_list,vscode);
        }else if (event.data.command === 'update_canvas') {

        }
    });

    // 初始化
    vscode.postMessage({
        command: 'init'
    });
}

function create_slider(id:String, min:number, max:number, value:number, height:number) {
    // @ts-ignore
    var slider = layui.slider;
    //渲染
    slider.render({
        elem: id,
        min: min,
        max: max,
        value: value,
        change: function(value: number){
            //do something
        }
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

function update_canvas(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, niftiImage: ArrayBuffer) {
    // @ts-ignore
    const canvas = document.getElementById('canvas');
    // @ts-ignore
    const slider = document.getElementById('slider');
    readNIFTI(niftiHeader, niftiImage, canvas, slider);
}

function readNIFTI(niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, niftiImage: ArrayBuffer, canvas: any, slider: any) {

    // set up slider
    var slices = niftiHeader.dims[3];

    // draw slice
    drawCanvas(canvas, slider.value, niftiHeader, niftiImage);
}

function drawCanvas(canvas: any, slice: number, niftiHeader: nifti.NIFTI1 | nifti.NIFTI2, niftiImage: ArrayBuffer) {
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
    var typedData;

    if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
        typedData = new Uint8Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
        typedData = new Int16Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
        typedData = new Int32Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
        typedData = new Float32Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
        typedData = new Float64Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
        typedData = new Int8Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
        typedData = new Uint16Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
        typedData = new Uint32Array(niftiImage);
    } else {
        console.log("数据是NIFITI2格式");
        return;
    }

    // offset to specified slice
    var sliceSize = cols * rows;
    var sliceOffset = sliceSize * slice;

    // draw pixels
    for (var row = 0; row < rows; row++) {
        var rowOffset = row * cols;

        for (var col = 0; col < cols; col++) {
            var offset = sliceOffset + rowOffset + col;
            var value = typedData[offset];

            /* 
               Assumes data is 8-bit, otherwise you would need to first convert 
               to 0-255 range based on datatype range, data range (iterate through
               data to find), or display range (cal_min/max).
               
               Other things to take into consideration:
                 - data scale: scl_slope and scl_inter, apply to raw value before 
                   applying display range
                 - orientation: displays in raw orientation, see nifti orientation 
                   info for how to orient data
                 - assumes voxel shape (pixDims) is isometric, if not, you'll need 
                   to apply transform to the canvas
                 - byte order: see littleEndian flag
            */
            canvasImageData.data[(rowOffset + col) * 4] = value & 0xFF;
            canvasImageData.data[(rowOffset + col) * 4 + 1] = value & 0xFF;
            canvasImageData.data[(rowOffset + col) * 4 + 2] = value & 0xFF;
            canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;
        }
    }
    ctx.putImageData(canvasImageData, 0, 0);
    console.log("绘制完成");
}

function hello() {
    console.log("hello");
}