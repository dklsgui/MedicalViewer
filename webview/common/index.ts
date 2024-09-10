// 该文件用于存放公共操作
import Reader from '../../reader';
import Viewer from '../../viewer';
import { DicomController } from '../dicom';
import { NiftiController } from '../nifti';
import { NrrdController } from '../nrrd';
declare let layui: any;

export function renderColorPicker(id: string, labelName:String, labelColorMap: Map<number, number[]>): boolean {
    let tbody = document.getElementById(id);
    if (!tbody) {
        return false;
    }
    // 清楚原有的内容
    tbody.innerHTML = '';
    // 为每一个label添加一个颜色选择器
    labelColorMap.forEach((value, key) => {
        let tr = document.createElement('tr');
        let label = document.createElement('td');
        let color = document.createElement('td');
        let colorShow = document.createElement('div');
        let colorSelect = document.createElement('div');
        
        label.innerText = key.toString();
        colorShow.className = 'color-show';
        colorShow.style.backgroundColor = `rgb(${value[0]},${value[1]},${value[2]})`;
        colorShow.onclick = function() {
            ((document.getElementById('label-' + key) as HTMLElement).children[0] as HTMLElement).click();
        };
        colorSelect.className = 'color-select';
        colorSelect.id = 'label-' + key;

        colorShow.appendChild(colorSelect);
        color.appendChild(colorShow);
        tr.appendChild(label);
        tr.appendChild(color);
        tbody.appendChild(tr);
        
        layui.use(function() {
            var colorpicker = layui.colorpicker;
            colorpicker.render({ // eg1
                elem: '#label-' + key,
                color: `rgb(${value[0]},${value[1]},${value[2]})`, // 初始颜色
                predefine: true,
                format: 'rgb', // 默认为 hex
                done: function(changeColor: any){
                    if(changeColor !== ''){
                        colorShow.style.backgroundColor = changeColor;
                        window.postMessage({
                            command: 'color_change', 
                            color: changeColor,
                            name: labelName,
                            labelValue: key
                        });
                    }
                }
            });
        });
    });
    return true;
}

export function addLabel(name: String, path: String, viewer: Viewer, controller: DicomController | NiftiController | NrrdController): void {
    let labelList = document.getElementById('label_list') as HTMLElement;
    let div = document.createElement('div');
    let span = document.createElement('span');
    let color_select = document.createElement('div');
    let i = document.createElement('i');

    let color = '0,0,255';
    let allColor = (viewer.label.get(name) as Reader).getAllColor();
    if (allColor.size > 0) {
        let values = allColor.values();
        color = (values.next().value as number[]).join(',') as string;
    }

    div.className = 'label';
    div.setAttribute('title', path.toString());
    div.style.backgroundColor = 'red';

    color_select.className = 'color_select';
    color_select.setAttribute('name', name.toString());
    color_select.style.backgroundColor = 'rgb(' + color + ')';
    color_select.addEventListener('click', () => {
        renderColorPicker('tbody_color_select', name, allColor);
        (document.getElementById('color_picker_button') as HTMLElement).click();
    });

    span.className = 'label_name';
    span.innerText = name.toString();
    span.setAttribute('is_selected', 'true');
    span.style.userSelect = 'none';
    span.addEventListener('click', () => {
        if (span.getAttribute('is_selected') === 'false') {
            span.setAttribute('is_selected', "true");
            div.style.backgroundColor = 'red';
            viewer.selected_label.push(name);
        } else {
            span.setAttribute('is_selected', "false");
            div.style.backgroundColor = 'rgb(0, 0, 255)';
            viewer.selected_label = viewer.selected_label.filter((value) => value !== name);
        }
        controller.drawCanvas();
    });
    i.className = 'layui-icon layui-icon-close delete_label';
    i.addEventListener('click', () => {
        div.remove();
        let length = viewer.selected_label.length;
        viewer.delete_label(name);
        if (length !== viewer.selected_label.length) {
            controller.drawCanvas();
        }
    });
    div.appendChild(color_select);
    div.appendChild(span);
    div.appendChild(i);
    labelList.appendChild(div);
    window.postMessage({
        command: 'render_colorpicker',
        elem: `div[name="${name}"]`,
        color: color,
        name: name
    }); // 重新渲染颜色选择器
}