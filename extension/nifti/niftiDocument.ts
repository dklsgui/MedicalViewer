import * as vscode from 'vscode';
import * as nifti from 'nifti-reader-js';
import { count } from 'console';

export class NiftiDocument implements vscode.CustomDocument {
    private readonly _uri: vscode.Uri;
    private readonly _uuid: string;
    private readonly _fd: number | Uint8Array;
    private readonly _label: Map<String,[String, ArrayBuffer, nifti.NIFTI1 | nifti.NIFTI2]> = new Map();

    constructor(
        uri: vscode.Uri,
        fd: number | Uint8Array
    ) {
        this._uri = uri;
        this._uuid = uri.path;
        this._fd = fd;
    }

    dispose(): void {}

    public get uri() {
        return this._uri;
    }

    public get uuid() {
        return this._uuid;
    }

    public get fd() {
        return this._fd;
    }
    
    private generate_label_name(path: String) {
        let label_name = path.split('/').pop()?.replace('.nii.gz', '').replace('.nii', '') as String;
        let temp_label_name = label_name;
        let count = 1;
        while (this._label.has(temp_label_name)) {
            temp_label_name = label_name + "_" + String(count);
            count++;
        }
        return temp_label_name;

    }

    public async add_label(uri: vscode.Uri[]) {
        let result: String[] = [];
        for (let i = 0; i < uri.length; i++) {
            const path: String = uri[i].path;
            const data: Uint8Array = await vscode.workspace.fs.readFile(uri[0]);
            let nii = nifti.Utils.toArrayBuffer(data);
            if (nifti.isCompressed(nii)) {
                nii = nifti.decompress(nii);
            }
            if (nifti.isNIFTI(nii)) {
                let header = nifti.readHeader(nii);
                if (header === null) {
                    return;
                }
                let label = nifti.readImage(header, nii);
                console.log(header.datatypeCode);
                let label_name = this.generate_label_name(path);
                result.push(label_name);
                this._label.set(label_name, [path, label, header]);
            }
        }
        return result;
    }

    public async delete_label(label_name: String) {
        this._label.delete(label_name);
    }
}