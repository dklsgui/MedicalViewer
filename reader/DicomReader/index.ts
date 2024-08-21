import * as dicomParser from 'dicom-parser';

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
                return "Data type not supported. Currently, the value can be Uint8, Int16, Int32, Float32, Float64, Int8, Uint16, Uint32";
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
            return "Unknown error";
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

    public get image() {
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

export default DicomType;