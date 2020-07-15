import * as wss from "ws";

export type WebSocketData = wss.Data;

type WebSocketDataType = 'b' | 's' | 'i' | 'us' | 'ui' | 'f' | 'd'
const size = { b: 1, s: 2, i: 4, us: 2, ui: 4, f: 4, d: 8 };

const dataHeader = 0x626c;

export class WebSocketDataReader {
    private _seek: number;
    private _buffer: Buffer;
    private _littleEndian: boolean;

    constructor(data: WebSocketData) {
        this._buffer = _wsDataBuffer(data);
        this._seek = 0;
        this._littleEndian = String.fromCharCode(this.readNumber('b')!) === 'l';
    }

    public readString(length: number): string | undefined {
        try {
            this._buffer.slice(this._seek, this._seek + length).toString('utf8');
        }
        catch {
            return undefined;
        }
    }

    public readNumber(type: WebSocketDataType): number | undefined {
        try {
            let value = null;
            if (type === 'b') {
                value = this._buffer.readUInt8(this._seek);
            }
            else {
                if (this._littleEndian) {
                    switch(type) {
                        case 's': value = this._buffer.readInt16LE(this._seek); break;
                        case 'i': value = this._buffer.readInt32LE(this._seek); break;
                        case 'us': value = this._buffer.readUInt16LE(this._seek); break;
                        case 'ui': value = this._buffer.readUInt32LE(this._seek); break;
                        case 'f': value = this._buffer.readFloatLE(this._seek); break;
                        case 'd': value = this._buffer.readDoubleLE(this._seek); break;
                    }
                }
                else {
                    switch(type) {
                        case 's': value = this._buffer.readInt16BE(this._seek); break;
                        case 'i': value = this._buffer.readInt32BE(this._seek); break;
                        case 'us': value = this._buffer.readUInt16BE(this._seek); break;
                        case 'ui': value = this._buffer.readUInt32BE(this._seek); break;
                        case 'f': value = this._buffer.readFloatBE(this._seek); break;
                        case 'd': value = this._buffer.readDoubleBE(this._seek); break;
                    }
                }
            }

            this._seek += size[type];
            return value;
        }
        catch {
            return undefined;
        }
    }
}

export class WebSocketDataBuilder {

    private _buffers: Buffer[];
    
    constructor() {
        this._buffers = [];
        this.writeNumber('us', dataHeader);
    }

    public build(): Buffer {
        return Buffer.concat(this._buffers);
    }

    public writeString(value: string) {
        this._buffers.push(new Buffer(value, 'utf8'));
    }

    public writeNumber(type: WebSocketDataType, value: number) {
        let buffer: Buffer;
        switch(type) {
            case 'b': buffer = new Buffer(new Uint8Array([value])); break;
            case 's': buffer = new Buffer(new Int16Array([value])); break;
            case 'i': buffer = new Buffer(new Int32Array([value])); break;
            case 'us': buffer = new Buffer(new Uint16Array([value])); break;
            case 'ui': buffer = new Buffer(new Uint32Array([value])); break;
            case 'f': buffer = new Buffer(new Float32Array([value])); break;
            case 'd': buffer = new Buffer(new Float64Array([value])); break;
        }
        this._buffers.push(buffer);
    }
}

function _wsDataBuffer(data: WebSocketData): Buffer {
    if (typeof(data) === 'string') {
        const bytes: number[] = []
        for(const char of data.split('')) {
            bytes.push(..._bytes(char.charCodeAt(0)));
        }
        return new Buffer(new Uint8Array(bytes));
    }

    if (data instanceof ArrayBuffer) {
        return new Buffer(data);
    }

    if (data instanceof Array) {
        return Buffer.concat(data);
    }

    if (data instanceof Buffer) {
        return data;
    }

    return data;
}

function _bytes(data: number): number[] {
    if (data == 0) return [0];
    const bytes: number[] = [];
    while(data > 0) {
        const n = data & 0x000000FF;
        bytes.push(n);
        data = data >> 8;
    }
    return bytes;
}

function _number(bytes: number[], length: number): number {
    let dword = 0;
    for(let i = length - 1; i >= 0; i--) {
        dword = (dword << 8) + bytes[i];
    }
    return dword;
}