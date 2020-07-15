import { IncomingMessage } from "http";
import * as url from "url";

export class HttpRequest {
    private _variableStores: {[store: string]: {[key: string]: string}};
    private _variableIndex: {[key: string]: [string, string]};
    private _url: url.UrlWithStringQuery;

    constructor(request: IncomingMessage, pathVariables: {[key: string]: string}) {
        this._variableStores = {};
        this._variableStores['p'] = pathVariables;
        this._url = url.parse(request.url!);
        
        this._variableStores['q'] = {};
        let query = this._url.search;
        if (query && query.startsWith('?')) {
            const params = query.substring(1).split('&');
            this._variableStores['q'] = this.getKvps('=', params);
        }

        this._variableStores['h'] = this.getKvps(':', request.rawHeaders);

        this._variableIndex = {};
        for (const variableStoreId of ['q', 'h', 'p']) {
            for (const key of Object.keys(this._variableStores[variableStoreId])) {
                this._variableIndex[key.toLowerCase()] = [variableStoreId, key];
            }
        }
    }

    public get url(): url.UrlWithStringQuery { return this._url; }
    
    public variable(name: string): string | undefined {
        const indexName = name.toLowerCase();
        if (indexName in this._variableIndex) {
            const i = this._variableIndex[indexName];
            return this.getVariable(...i);
        }
        return undefined;
    }

    public querystring(name: string): string | undefined {
        return this.getVariable('q', name);
    }

    public header(name: string): string | undefined {
        return this.getVariable('h', name);
    }

    public path(name: string): string | undefined {
        return this.getVariable('p', name);
    }

    private getVariable(store: string, name: string): string | undefined {
        if (name in this._variableStores[store]) {
            return this._variableStores[store][name]
        }
        return undefined;
    }

    private getKvps(separator: string, values: string[]) {
        const kvps: {[key: string]: string} = {};
        for (const p of values) {
            const i = p.indexOf(separator);
            if (i === -1) {
                kvps[decodeURIComponent(p)] = '';
            }
            else {
                const key = decodeURIComponent(p.substring(0, i).trim())
                const value = decodeURIComponent(p.substring(i + 1).trim())
                kvps[key] = value;
            }
        }
        return kvps;
    }
}