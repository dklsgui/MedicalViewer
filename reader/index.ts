import NiftiType from './NiiReader/index';
import DicomType from './DicomReader/index';
import { to2DArray, to3DArray } from '../utils/util';

class Reader {
    private _image: any;
    private _dimensions: number[];
    private _file_type: String;
    private _data_type: String;
    private _path: String;
    private _name: String;
    private _color: number[];
    private _spacing: number[];
    private _max_pixel: number;
    private _min_pixel: number;

    public static verify(data:Uint8Array, fileType:String, path:String): Reader | String {
        let result;
        if (fileType === 'nii') {
            result = NiftiType.verifyNifti(data, path);
            if(result instanceof NiftiType){

                return new Reader(
                    to3DArray(result.image, result.niftiHeader.dims.slice(1, 4)),
                    result.niftiHeader.dims.slice(1, 4),
                    "nii",
                    result.data_type,
                    result.path,
                    result.name,
                    result.niftiHeader.pixDims.slice(1,4),
                    result.image.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER),
                    result.image.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER),
                    result.color
                );
            }
        } else if (fileType === 'dcm') {
            result = DicomType.verifyDicom(data, path);
            if(result instanceof DicomType){
                return new Reader(
                    to2DArray(result.image, result.rows, result.cols),
                    [result.rows, result.cols],
                    "dcm",
                    result.data_type,
                    result.path,
                    result.name,
                    [],
                    result.image.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER),
                    result.image.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER),
                    result.color
                );
            }
        } else if (fileType === "nrrd"){
            result = "The file type is not supported";
        }else {
            result = "The file type is not supported";
        }
        return result;
    }

    constructor(data: any, dimensions: number[], fileType: String, data_type: String, path: String, name: String, spaceing: number[], max_pixel: number, min_pixel: number, color: number[]) {
        this._image = data;
        this._dimensions = dimensions;
        this._file_type = fileType;
        this._data_type = data_type;
        this._path = path;
        this._name = name;
        this._spacing = spaceing;
        this._max_pixel = max_pixel;
        this._min_pixel = min_pixel;
        this._color = color;
    }

    public get image() {
        return this._image;
    }

    public get dims() {
        return this._dimensions;
    }

    public get fileType() {
        return this._file_type;
    }

    public get dataType() {
        return this._data_type;
    }

    public get path() {
        return this._path;
    }

    public get name() {
        return this._name;
    }

    public get spacing() {
        return this._spacing;
    }

    public get maxPixel() {
        return this._max_pixel;
    }

    public get minPixel() {
        return this._min_pixel;
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

export default Reader;