import { WebSocketData } from "./ws-data";

export type WebSocketRouteEvaluator = (incoming: WebSocketData) => boolean;
export type WebSocketHandler = (id: string, incoming: WebSocketData) => WebSocketData | void | Promise<WebSocketData> | Promise<void>

export class WebSocketRoute {

    private _evaluator: WebSocketRouteEvaluator;
    private _handler: WebSocketHandler;

    constructor(evaluator: WebSocketRouteEvaluator, handler: WebSocketHandler) {
        this._evaluator = evaluator;
        this._handler = handler;
    }

    public get handle(): WebSocketHandler { return this._handler; }
    public match(incoming: WebSocketData): boolean {
        return this._evaluator(incoming);
    }

    
}