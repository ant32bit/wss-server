import { WebSocketRoute } from "./ws-route";
import { WebSocketData } from "./ws-data";
import { expect } from "../../tools/promise";


export class WebSocketRouter {

    private _routes: WebSocketRoute[] = [];

    constructor() { }

    addRoute(route: WebSocketRoute): WebSocketRouter {
        this._routes.push(route);
        return this;
    }

    public async incoming(id: string, data: WebSocketData): Promise<WebSocketData | null> {
        for (const route of this._routes) {
            if(route.match(data)) {
                const outgoing = await expect(route.handle(id, data));
                return outgoing != null ? outgoing : null;
            }
        }
        return null;
    }
}