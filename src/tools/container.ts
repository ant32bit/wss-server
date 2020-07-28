import { TextEncoder, TextDecoder } from "util";

type ValueType = 'b' | 's' | 'l' | 'us' | 'ul' | 'f' | 'd';
const sizes = { b: 1, s: 2, l: 4, us: 2, ul: 4, f: 4, d: 8 };
const types = { b: "byte", s: "short", l: "long", us: "unsigned short", ul: "unsigned long", f: "float", d: "double" };

type ValueSpec = 
    { type: ValueType, value: number } | 
    { type: 'c', value: Container } |
    { type: 'z', value: string, encoded: Uint8Array };

export interface ContainerBuilderOptions {
    fixedLength?: boolean;
}

export class ContainerBuilder {
    private _head: string;
    public get head() { return this._head; }

    private _values: ValueSpec[] = [];
    private _options: ContainerBuilderOptions;

    constructor(head: string, options?: ContainerBuilderOptions) {
        this._head = head;
        this._options = {
            fixedLength: options?.fixedLength || true
        }
    }

    addByte(value: number) { this._addValue(value, 'b', 0, 255); }
    addShort(value: number) { this._addValue(value, 's', -32768, 32767); }
    addLong(value: number) { this._addValue(value, 'l', -2147483648, 2147483647); }
    addUShort(value: number) { this._addValue(value, 'us', 0, 65535); }
    addULong(value: number) { this._addValue(value, 'ul', 0, 4294967295); }
    addFloat(value: number) { this._values.push({type: 'f', value}); }
    addDouble(value: number) { this._values.push({type: 'd', value}); }
    addString(value: string) { this._values.push({ type: 'z', value, encoded: new TextEncoder().encode(value) }); }
    addContainer(container: Container) { this._values.push({ type: 'c', value: container }); }
    addBooleanArray(values: boolean[]) {
        const mSize = values.length / 8;
        let type: ValueType | null = null;
        for (const proposedType of ['b', 'us', 'ul'] as ValueType[]) {
            if (mSize <= sizes[proposedType]) {
                type = proposedType;
                break;
            }
        }

        if (type == null) { throw TypeError('boolean array cannot fit in a ulong, split in max 4 byte arrays'); }
        const value = parseInt(values.map(x => x ? '1': '0').join(''), 2);
        this._values.push({type, value});
    }

    build(): Container {
        let length = 4;
        if (!this._options.fixedLength)
            length += 4;

        for (const valueDef of this._values) {
            if (valueDef.type === 'c') {
                length += valueDef.value.length;
            }
            else if (valueDef.type === 'z') {
                length += valueDef.encoded.length + 1;
            }
            else {
                length += sizes[valueDef.type]
            }
        }

        const buffer = new Buffer(length);
        let pos = 0;
        buffer.write(this._head, pos, 'ascii');
        pos += 4;
        if (!this._options.fixedLength) {
            buffer.writeUInt32BE(length, pos);
            pos += 4;
        }
        for (const valueDef of this._values) {
            switch(valueDef.type) {
                case 'b': buffer.writeUInt8(valueDef.value, pos); break;
                case 's': buffer.writeInt16BE(valueDef.value, pos); break;
                case 'l': buffer.writeInt32BE(valueDef.value, pos); break;
                case 'us': buffer.writeUInt16BE(valueDef.value, pos); break;
                case 'ul': buffer.writeUInt32BE(valueDef.value, pos); break;
                case 'f': buffer.writeFloatBE(valueDef.value, pos); break;
                case 'd': buffer.writeDoubleBE(valueDef.value, pos); break;
                case 'z': 
                    new Buffer(valueDef.encoded).copy(buffer, pos)
                    buffer.writeUInt8(0);
                    break;
                case 'c': 
                    valueDef.value.content.copy(buffer, pos); break;
            }

            if (valueDef.type === 'c') {
                pos += valueDef.value.content.length;
            }
            else if (valueDef.type === 'z') {
                pos += valueDef.encoded.length + 1;
            }
            else {
                pos += sizes[valueDef.type];
            }
        }

        return new Container(buffer);
    }

    private _addValue(value: number, type: ValueType, min: number, max: number) {
        if (value >= min && value <= max) {
            this._values.push({ type, value });
        }
        else {
            throw TypeError(`value ${value} - expected ${types[type]}`);
        }
    }
}

export class Container {
    public static readLength(data: string | Buffer | ArrayBuffer | Buffer[]) {
        if (data instanceof ArrayBuffer) return new Buffer(data).readUInt32BE(4);
        if (data instanceof Array) return data[0].readUInt32BE(4);
        if (data instanceof Buffer) return data.readUInt32BE(4);
        return undefined;
    }

    public static readHead(data: string | Buffer | ArrayBuffer | Buffer[]) {
        if (data instanceof ArrayBuffer) return _getHead(new Buffer(data));
        if (data instanceof Array) return _getHead(data[0]);
        if (data instanceof Buffer) return _getHead(data);
        return data.substring(0, 4);
    }

    private _head: string;
    public get head() { return this._head; }

    private _content: Buffer;
    public get content() { return this._content; }
    public get length() { return this._content.length; }

    private _pos: number;

    constructor(data: string | Buffer | ArrayBuffer | Buffer[]) {
        this._content = _toBuffer(data);
        this._head = String.fromCharCode(...Array.from(this._content.slice(0, 4)));
        this._pos = 4;
    }

    readByte() { return this._readValue('b'); }
    readShort() { return this._readValue('s'); }
    readLong() { return this._readValue('l'); }
    readUShort() { return this._readValue('us'); }
    readULong() { return this._readValue('ul'); }
    readFloat() { return this._readValue('f'); }
    readDouble() { return this._readValue('d'); }
    readString() {
        const bytes: number[] = [];
        while (true) {
            const byte = this.readByte();
            if (byte === 0)
                return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
            bytes.push(byte);
        }
    }

    readContainer(size: number) {
        const start = this._pos;
        const end = this._pos + size;
    }

    readBooleanArray(size: number) {
        const mSize = size / 8;
        let type: ValueType | null = null;
        for (const proposedType of ['b', 'us', 'ul'] as ValueType[]) {
            if (mSize <= sizes[proposedType]) {
                type = proposedType;
                break;
            }
        }

        if (type == null) { throw TypeError('boolean array cannot fit in a ulong, split in max 4 byte arrays'); }
        const value = this._readValue(type);
        const values = value.toString(2);
        return values
            .substring(values.length - size)
            .split('')
            .map(x => x === '1');
    }

    private _readValue(type: ValueType) {
        const start = this._pos;
        const end = start + sizes[type];
        if (end >= this.length) {
            throw RangeError(`attempted to read past the end of a ${this._head} container`);
        }

        this._pos = end;

        switch(type) {
            case 'b': return this._content.readUInt8(start);
            case 's': return this._content.readUInt16BE(start);
            case 'l': return this._content.readUInt32BE(start);
            case 'us': return this._content.readInt16BE(start);
            case 'ul': return this._content.readInt32BE(start);
            case 'f': return this._content.readFloatBE(start);
            case 'd': return this._content.readDoubleBE(start);
        }
    }
}

function _getHead(data: Buffer): string {
    return String.fromCharCode(...Array.from(data.slice(0, 4)));
}

function _unicodeToBytes(data: number): number[] {
    if (data == 0) return [0];
    const bytes: number[] = [];
    while(data > 0) {
        const n = data & 0x000000FF;
        bytes.push(n);
        data = data >> 8;
    }
    return bytes;
}

function _toBuffer(data: string | Buffer | ArrayBuffer | Buffer[]): Buffer {
    if (typeof(data) === 'string') {
        return new Buffer(new TextEncoder().encode(data))
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