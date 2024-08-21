import Reader from "../reader/index";

class Viewer {
    private _data: Reader;
    private _label: Map<String, Reader> = new Map();
    private _max_pixel: number = 0;
    private _min_pixel: number = 0;
    private _selected_label: String[] = [];

    constructor(data: Reader) {
        this._data = data;
        this._max_pixel = this._data.maxPixel;
        this._min_pixel = this._data.minPixel;
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

    public add_label(label: Reader): String {
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

export default Viewer;