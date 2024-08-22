import NiftiType from './NiiReader/index';
import DicomType from './DicomReader/index';
import NrrdType from './NrrdReader/index';
import { timeout, to2DArray, to3DArray } from '../utils/util';

class Reader {
    private _image: any;
    private _dimensions: number[];
    private _fileType: String;
    private _dataType: String;
    private _path: String;
    private _name: String;
    private _color: Map<number, number[]>;
    private _spacing: number[];
    private _maxPixel: number;
    private _minPixel: number;
    // 当读取的是标签时, 用于存储有那些标签值
    private _labelPixel: number[] | null;

    public static async verify(data:Uint8Array, fileType:String, path:String, type:String = "image"): Promise<String | Reader> {
        let result;
        let labelPixel: number[] | null = null;
        if (fileType === 'nii') {
            result = NiftiType.verifyNifti(data, path);
            if(result instanceof NiftiType){
                if (type === "label") {
                    labelPixel = await Reader.getLabelPixel(result.image);
                    if (labelPixel === null) {
                        return "The label categories are too many. Reduce the label categories";
                    }
                    labelPixel = labelPixel.filter((value, _, self) => self.indexOf(value) !== 0);
                    labelPixel.sort();
                }
                result = new Reader(
                    to3DArray(result.image, result.niftiHeader.dims.slice(1, 4)),
                    result.niftiHeader.dims.slice(1, 4),
                    path.endsWith('.nii') ? 'nii' : 'nii.gz',
                    result.data_type,
                    path,
                    result.niftiHeader.pixDims.slice(1,4),
                    result.image.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER),
                    result.image.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER),
                    labelPixel
                );
            }
        } else if (fileType === 'dcm') {
            result = DicomType.verifyDicom(data, path);
            if(result instanceof DicomType){
                if (type === "label") {
                    labelPixel = await Reader.getLabelPixel(result.image);
                    if (labelPixel === null) {
                        return "The label categories are too many. Reduce the label categories";
                    }
                    labelPixel = labelPixel.filter((value, _, self) => self.indexOf(value) !== 0);
                    labelPixel.sort();
                }
                result = new Reader(
                    to2DArray(result.image, result.rows, result.cols),
                    [result.rows, result.cols],
                    "dcm",
                    result.data_type,
                    path,
                    [],
                    result.image.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER),
                    result.image.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER),
                    labelPixel
                );
            }
        } else if (fileType === "nrrd"){
            result = await NrrdType.verifyNrrd(data, path);
            if (result instanceof NrrdType) {
                if (type === "label") {
                    labelPixel = await Reader.getLabelPixel(result.image);
                    if (labelPixel === null) {
                        return "The label categories are too many. Reduce the label categories";
                    }
                    labelPixel = labelPixel.filter((value, _, self) => self.indexOf(value) !== 0);
                    labelPixel.sort();
                }
                result = new Reader(
                    to3DArray(result.image, result.dims),
                    result.dims,
                    "nrrd",
                    result.data_type,
                    path,
                    result.spacing,
                    result.image.reduce((acc: any, cur: any) => Math.max(acc, cur), Number.MIN_SAFE_INTEGER),
                    result.image.reduce((acc: any, cur: any) => Math.min(acc, cur), Number.MAX_SAFE_INTEGER),
                    labelPixel
                );
            }
        }else {
            result = "The file type is not supported";
        }
        return result;
    }

    constructor(data: any, dimensions: number[], fileType: String, dataType: String, path: String, spaceing: number[], maxPixel: number, minPixel: number, labelPixel: number[] | null = null) {
        this._image = data;
        this._dimensions = dimensions;
        this._fileType = fileType;
        this._dataType = dataType;
        this._path = path;
        this._name = '';
        this._spacing = spaceing;
        this._maxPixel = maxPixel;
        this._minPixel = minPixel;
        this._color = new Map();
        this._labelPixel = labelPixel;
    }

    private static async getLabelPixel(data: any): Promise<number[] | null>{
        try {
            return await Promise.race([
                new Promise<number[]>(resolve => {
                    resolve(Array.from(new Set(data)));
                }), timeout(5)
            ]);
        }catch (e) {
            return null;
        }
    }

    public get image() {
        return this._image;
    }

    public get dims() {
        return this._dimensions;
    }

    public get fileType() {
        return this._fileType;
    }

    public get dataType() {
        return this._dataType;
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
        return this._maxPixel;
    }

    public get minPixel() {
        return this._minPixel;
    }

    public getColorByLabelValue(labelValue: number): number[] {
        return this._color.get(labelValue) as number[];
    }

    public getAllColor(): Map<number, number[]> {
        return this._color;
    }

    public get labelPixel() {
        return this._labelPixel;
    }

    public set name(name: String) {
        this._name = name;
    }

    public setColor(labelValue: number, color: number[]) {
        this._color.set(labelValue, color);
    }
}

export default Reader;