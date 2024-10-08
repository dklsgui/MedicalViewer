// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NiftiEditorProvider } from './nifti/niftiEditor';
import { DicomEditorProvider} from './dicom/dicomEditor';
import { NrrdEditorProvider } from './nrrd/nrrdEditor';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(NiftiEditorProvider.register(context));
	context.subscriptions.push(DicomEditorProvider.register(context));
	context.subscriptions.push(NrrdEditorProvider.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
