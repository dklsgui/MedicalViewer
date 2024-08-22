import * as vscode from 'vscode';
import { Buffer } from 'buffer';
import { Document } from '../common/document';
import { uint8ArrayToBase64 } from '../../utils/util';

export class DicomEditorProvider implements vscode.CustomReadonlyEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new DicomEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            DicomEditorProvider.viewType, 
            provider, {
                webviewOptions: {
                    retainContextWhenHidden: true,
                }
            });
        return providerRegistration;
    }

    private static readonly viewType = 'medical-viewer.Dicom';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    async openCustomDocument(
        uri: vscode.Uri
    ): Promise<Document> {
        const data: Uint8Array = await vscode.workspace.fs.readFile(uri);
        const document: Document = new Document(uri, data);
        return document;
    }

    async resolveCustomEditor(
        document: Document,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview);
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            if (e.command === 'init') {
                webviewPanel.webview.postMessage({
                    command: 'init',
                    data: uint8ArrayToBase64(document.fd as Uint8Array),
                    alpha: vscode.workspace.getConfiguration().get('medicalViewer.alpha'),
                    level: vscode.workspace.getConfiguration().get('medicalViewer.Dicom.windowLevel'),
                    width: vscode.workspace.getConfiguration().get('medicalViewer.Dicom.windowWidth'),
                    path: document.uuid
                });
            }else if (e.command === 'show_label_dialog') {
                let uri = await vscode.window.showOpenDialog({
                    canSelectMany: true,
                    canSelectFiles: true,
                    canSelectFolders: false,
                    filters: {
                        'DICOM': ['dcm']
                    }
                });
                if (uri === undefined || uri.length === 0) {
                    return;
                }
                for (let i = 0; i < uri.length; i++) {
                    const path: String = uri[i].path;
                    vscode.workspace.fs.readFile(uri[0]).then((data: Uint8Array) => {
                        webviewPanel.webview.postMessage({
                            command: 'add_label',
                            data: uint8ArrayToBase64(data),
                            path: path,
                        });
                    });
                }
            }
        });
        webviewPanel.onDidDispose(() => {
        });
    }

    private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        const ext = vscode.extensions.getExtension('dklsgui.medical-viewer');
        if (!ext) {
            throw new Error('Extension not found');
        }
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                ext.extensionUri,
                'dist',
                'webview/dicom/index.css'
            )
        );
        const baseCssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                ext.extensionUri,
                'dist',
                'webview/style/base.css'
            )
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                ext.extensionUri,
                'dist',
                'webview/dicom/index.js'
            )
        );
        const uri = ext.extensionUri.with({
            path: ext.extensionUri.path + '/dist/webview/view/index2D.html'
        });
        const html = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(html).toString('utf8')
            .replace(/\$\{scriptUri\}/g, scriptUri.toString())
            .replace(/\$\{cssUri\}/g, cssUri.toString())
            .replace(/\$\{baseCssUri\}/g, baseCssUri.toString());
    }
}