
import * as fs from 'fs';
import * as path from 'path';
import { HttpRequest } from './http-request';
import { HttpRouteHandler } from './http-route';
import { IHttpResponse } from './http-response';

const contentTypes: {[extension: string]: string} = {
    css: 'text/css',
    gif: 'image/gif',
    html: 'text/html',
    ico: 'image/x-icon',
    jpg: 'image/jpeg',
    js: 'application/javascript',
    png: 'image/png',
    svg: 'image/svg',
    txt: 'text/plain'
};

export class HttpFileRoutes {

    private _contentFolder: string;
    private _routeHandler: HttpRouteHandler;
    public get routeHandler() { return this._routeHandler; }

    constructor(contentFolder: string) {
        this._contentFolder = contentFolder;
        this._routeHandler = async (request: HttpRequest): Promise<IHttpResponse> => {
            let fileLocation = request.url.pathname!;
            if (path.extname(fileLocation) === '') {
                fileLocation = path.join(fileLocation, 'index.html');
            }
            const physicalFile = path.join(this._contentFolder, fileLocation);
            if (await this.exists(physicalFile)) {
                const content = await this.readContents(physicalFile);
                const contentType = contentTypes[path.extname(physicalFile).substring(1).toLowerCase()] || 'application/octet-stream';
                return { 
                    statusCode: 200, 
                    headers: { 'Content-Type': contentType },
                    body: content
                };
            }
            else {
                return { statusCode: 404 };
            }
        };
    }

    private exists(physicalFile: string): Promise<boolean> {
        return new Promise<boolean>((res, rej) => {
            return fs.exists(physicalFile, res);
        });
    }

    private readContents(physicalFile: string): Promise<Buffer> {
        return new Promise<Buffer>((res, rej) => {
            fs.readFile(physicalFile, (err, buffer) => {
                if (err) rej(err);
                else res(buffer);
            });
        });
    }
}