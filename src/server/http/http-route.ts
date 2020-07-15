import * as url from 'url';
import { IncomingMessage } from "http";
import { HttpRequest } from "./http-request";
import { IHttpResponse } from "./http-response";

export type HttpRouteHandler = (request: HttpRequest) => IHttpResponse | Promise<IHttpResponse>;

export class HttpRoute {

    private _routePattern: string;
    private _routeComponents: string[];
    private _handler: HttpRouteHandler;

    constructor(routePattern: string, handler: HttpRouteHandler) {
        if (!routePattern) {
            this._routePattern = '/';
        }
        else if (!routePattern.startsWith('/')) {
            this._routePattern = '/' + routePattern;
        }
        else {
            this._routePattern = routePattern;
        }

        this._routeComponents = this._routePattern.split('/');
        this._handler = handler;
    }

    public handle(request: IncomingMessage): IHttpResponse | Promise<IHttpResponse> | null {
        const variables = this.matchRoute(request.url!);
        if (variables == null) {
            return null;
        }

        const httpRequest = new HttpRequest(request, variables);
        return this._handler(httpRequest);
    }

    private matchRoute(requestUrl: string): {[key: string]: string} | null {
        const variables: {[key: string]: string} = {};
        const urlObj = url.parse(requestUrl)
        const pathComponents = urlObj.pathname?.split('/')
        if (!pathComponents) {
            return this._routePattern == '/' ? {} : null;
        }
        if (pathComponents.length != this._routeComponents.length) {
            return null;
        }
        for (let i = 0; i < pathComponents?.length; i++) {
            const routeComponent = this._routeComponents[i];
            if (pathComponents[i].toLowerCase() != routeComponent.toLowerCase()) {
                if (routeComponent.startsWith('{') && routeComponent.endsWith('}')) {
                    variables[routeComponent.substring(1, routeComponent.length - 1)] = pathComponents[i];
                }
                else {
                    return null;
                }
            }
        }
        return variables;
    }
}