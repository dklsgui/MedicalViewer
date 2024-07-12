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
}