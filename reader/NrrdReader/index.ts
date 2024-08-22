const { nrrdReadImage } = require("@itk-wasm/image-io");
class NrrdType{
    private _image: any;
    private _data_type: String;
    private _dims: number[];
    private _spacing: number[];

    public static async verifyNrrd(data: Uint8Array, path: String) {
        const platform  = window.navigator.platform.toLowerCase();
        if (platform.indexOf('win') >= 0){
            path = path.replace(/\//g, "\\");
        } else if (platform.indexOf('linux') >= 0) {
            console.log(path);
        }
        let result = await nrrdReadImage({ data: data, path: path}, {informationOnly: false, webWorker: false, noCopy: true});
        if (result.couldRead) {
            let data_type: String;
            if (result.image.imageType.componentType === 'uint8') {
                data_type = 'Uint8';
            } else if (result.image.imageType.componentType === 'int16') {
                data_type = 'Int16';
            } else if (result.image.imageType.componentType === 'int32') {
                data_type = 'Int32';
            } else if (result.image.imageType.componentType === 'float32') {
                data_type = 'Float32';
            } else if (result.image.imageType.componentType === 'float64') {
                data_type = 'Float64';
            } else if (result.image.imageType.componentType === 'int8') {
                data_type = 'Int8';
            } else if (result.image.imageType.componentType === 'uint16') {
                data_type = 'Uint16';
            } else if (result.image.imageType.componentType === 'uint32') {
                data_type = 'Uint32';
            } else {
                return "Data type not supported. Currently, the value can be Uint8, Int16, Int32, Float32, Float64, Int8, Uint16, Uint32";
            }
            return new NrrdType(result.image.data, result.image.size, result.image.spacing, data_type);
        }
        return "File is not a NIFTI file";
    }

    constructor(image: any, dims: number[], spacing: number[], data_type:String) {
        this._image = image;
        this._dims = dims;
        this._spacing = spacing;
        this._data_type = data_type;
    }

    public get image() {
        return this._image;
    }

    public get dims() {
        return this._dims;
    }

    public get spacing() {
        return this._spacing;
    }

    public get data_type() {
        return this._data_type;
    }
}

export default NrrdType;