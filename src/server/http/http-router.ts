import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import { HttpRoute, HttpRouteHandler } from './http-route';
import { HttpRequest } from './http-request';
import { IHttpResponse } from './http-response';
import { expect } from '../../tools/promise';

const statusText: { [code: number]: string } = {
    200: "Success",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    410: "Gone",
    418: "I'm a teapot (RFC 2324)",
    429: "Too Many Requests",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
};

export class HttpRouter {

    private _serverName: string = ''
    private _routes: HttpRoute[];
    private _handleDefaultRoute: HttpRouteHandler;
    private _handleExceptionRoute: HttpRouteHandler;
    private _handleFinalExceptionRoute: HttpRouteHandler;

    constructor() {
        this._routes = [];
        this._handleDefaultRoute = (request: HttpRequest): IHttpResponse => ({ statusCode: 404 });
        this._handleExceptionRoute = (request: HttpRequest): IHttpResponse => ({ statusCode: 500 });
        this._handleFinalExceptionRoute = this._handleExceptionRoute;
    }

    public set serverName(value: string) { this._serverName = value; }

    public addRoute(route: HttpRoute): HttpRouter {
        this._routes.push(route);
        return this;
    }

    public set defaultRouteHandler(handler: HttpRouteHandler) {
        this._handleDefaultRoute = handler;
    }

    public set exceptionRouteHandler(handler: HttpRouteHandler) {
        this._handleExceptionRoute = handler;
    }

    public get handler() { return this._handler; }
    private _handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
        console.log('Processing request: ' + request.url);
        try {
            for (const route of this._routes) {

                const routeResult = route.handle(request);
                if (routeResult == null) {
                    continue;
                }
                const httpResponse = await expect(routeResult);
                this.writeServerResponse(response, httpResponse);
                return;
            }

            const httpRequest = new HttpRequest(request, {});
            const httpResponse = await expect(this._handleDefaultRoute(httpRequest));
            this.writeServerResponse(response, httpResponse);
            return;
        }
        catch (e) {
            console.log(e);
            const httpRequest = new HttpRequest(request, {});
            let httpResponse: IHttpResponse;

            try {
                httpResponse = await expect(this._handleExceptionRoute(httpRequest));
            }
            catch (fe) {
                console.log(fe);
                httpResponse = await expect(this._handleFinalExceptionRoute(httpRequest));
            }

            this.writeServerResponse(response, httpResponse);
            return;
        }
    }

    private writeServerResponse(serverResponse: ServerResponse, httpResponse: IHttpResponse) {
        const headers: OutgoingHttpHeaders = {};
        if (httpResponse.headers) {
            for (const key of Object.keys(httpResponse.headers)) {
                const value = httpResponse.headers[key];
                if (value) {
                    const lowerKey = key.toLowerCase();
                    const header = standardResponseHeaders[lowerKey] || key;
                    headers[header] = value;
                }
            }
        }

        headers['Date'] = new Date().toISOString();
        headers['Server'] = this._serverName;
        headers['Content-Length'] = httpResponse.body?.length || 0;

        if (httpResponse.body && !('Content-Type' in headers)) {
            let contentType = 'application/octet-stream';
            if (typeof httpResponse.body == 'string') {
                try {
                    const content = JSON.parse(httpResponse.body);
                    contentType = 'application/json';
                }
                catch {
                    contentType = 'text/plain'
                }
            }
            headers['Content-Type'] = contentType;
        }
        
        serverResponse.writeHead(httpResponse.statusCode, statusText[httpResponse.statusCode], headers);
        serverResponse.end(httpResponse.body || '');
    };
}

const standardResponseHeaders = [
    'Accept-Patch',
    'Accept-Ranges',
    'Access-Control-Allow-Credentials',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Origin',
    'Access-Control-Expose-Headers',
    'Access-Control-Max-Age',
    'Access-Control-Request-Headers',
    'Access-Control-Request-Method',
    'Age',
    'Allow',
    'Alt-Svc',
    'Cache-Control',
    'Connection',
    'Content-Disposition',
    'Content-Encoding',
    'Content-Language',
    'Content-Length',
    'Content-Location',
    'Content-MD5',
    'Content-Range',
    'Content-Type',
    'Date',
    'Delta-Base',
    'ETag',
    'Expires',
    'IM',
    'Last-Modified',
    'Link',
    'Location',
    'P3P',
    'Pragma',
    'Proxy-Authenticate',
    'Public-Key-Pins',
    'Retry-After',
    'Server',
    'Set-Cookie',
    'Strict-Transport-Security',
    'Tk',
    'Trailer',
    'Transfer-Encoding',
    'Upgrade',
    'Vary',
    'Via',
    'Warning',
    'WWW-Authenticate',
    'X-Frame-Options'
].reduce((p, c) => { p[c.toLowerCase()] = c; return p; }, {} as {[key: string]: string});

