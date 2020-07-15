import * as crypto from 'crypto';

export function uuidv4() {
    return ('10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => {
        const i = parseInt(c);
        // tslint:disable-next-line:no-bitwise
        const v = (i ^ crypto.randomBytes(1)[0] & 15 >> i / 4).toString(16);
        return v;
    }));
}
