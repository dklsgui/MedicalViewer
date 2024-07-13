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