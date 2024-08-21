import * as nifti from 'nifti-reader-js';

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
                return "File header does not exist";
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
                return "Data type not supported. Currently, the value can be Uint8, Int16, Int32, Float32, Float64, Int8, Uint16, Uint32";
            }
            return new NiftiType(header, image, data_type,path, '');
        }
        return "File is not a NIFTI file";
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

    public get image() {
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
}

export default NiftiType;