import Reader from "../reader/index";
import { containsArray } from "../utils/util";

class Viewer {
    private _data: Reader;
    private _label: Map<String, Reader> = new Map();
    private _max_pixel: number = 0;
    private _min_pixel: number = 0;
    private _selected_label: String[] = [];
    private _PresetColor: number[][] = [
        [144,238,144], [192,104,88], [0,245,255], [220,20,60], [0,0,255], [255,0,255], [255,255,0],
        [255,165,0], [186,85,211], [255,182,193]
    ];

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
        for (let i = 0; i < (label.labelPixel as number[]).length; i++) {
            label.setColor((label.labelPixel as number[])[i], this.generate_color_for_label());
        }
        let name = (label.path.split('/').pop() as String).replace(label.fileType.toString(), '') as String;
        name = this.generate_label_name(name);
        label.name = name;
        this._label.set(name, label);
        return name;
    }

    public delete_label(name: String) {
        try{
            this._selected_label = this._selected_label.filter((value) => value !== name);
            let label = this._label.get(name) as Reader;
            this._label.delete(name);
            new Promise(() => {
                let colors = label.getAllColor();
                for (let color of colors.values()) {
                    if (!containsArray(this._PresetColor, color)) {
                        this._PresetColor.push(color);
                    }
                }
            });
        }catch(e) {
            console.log(e);
            return;
        }
    }

    public generate_color_for_label(): number[]{
        if (this._PresetColor.length > 0) {
            return this._PresetColor.shift() as number[];
        }
        let labelNames = this._label.keys();
        while (true) {
            let r = Math.round(Math.random() * 255); //随机生成256以内r值
            let g = Math.round(Math.random() * 255); //随机生成256以内g值
            let b = Math.round(Math.random() * 255); //随机生成256以内b值
            let color = [r, g, b];
            let flag = true;
            for(let labelName of labelNames) {
                let labelColor = Array.from((this._label.get(labelName) as Reader).getAllColor().values());
                if (containsArray(labelColor, color)) {
                    flag = false;
                    break;
                }
            }
            if (flag) {
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