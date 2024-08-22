export function base64ToUint8Array(base64: any): Uint8Array{
    // @ts-ignore
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function uint8ArrayToBase64(uint8Array: Uint8Array) {
    const buffer = Buffer.from(uint8Array);
    return buffer.toString('base64');
}

export function to3DArray(
    data: Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array, 
    shape: number[]): number[][][] {
    if (data.length !== shape[0] * shape[1] * shape[2]) {
        throw new Error("The size of the Float64Array does not match the specified dimensions.");
    }

    let result: number[][][] = [];

    for (let i = 0; i < shape[0]; i++) {
        let temp1: number[][] = [];
        for (let j = 0; j < shape[1]; j++) {
            let temp2: number[] = [];
            for (let k = 0; k < shape[2]; k++) {
                temp2.push(data[i + j * shape[0] + k * shape[0] * shape[1]]);
            }
            temp1.push(temp2);
        }
        result.push(temp1);
    }
    return result;
}

export function to2DArray(
    data: Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array, 
    rows: number, 
    cols: number): number[][] {
    if (data.length !== rows * cols) {
        throw new Error("The size of the Float64Array does not match the specified dimensions.");
    }
    let result: number[][] = [];

    for (let row = 0; row < rows; row++) {
        let temp: number[] = [];
        for (let col = 0; col < cols; col++) {
            temp.push(data[row * cols + col]);
        }
        result.push(temp);
    }
    return result;
}

export function timeout(s: number = 2): Promise<null> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(null);
        }, s * 1000);
    });
}

export function containsArray(arrayOfArrays: number[][], targetArray: number[]): boolean {
    return arrayOfArrays.some(array => array.every((value, index) => value === targetArray[index]));
}