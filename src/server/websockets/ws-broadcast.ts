import { WebSocketData } from "./ws-data";
import { Server } from "../server";
import { expect } from "../../tools/promise";

export type WebSocketBroadcastHandler = (wsId: string) => WebSocketData | null | Promise<WebSocketData | null>;

export class WebSocketBroadcaster {
    private _server: Server;
    private _schedule: {[intervalMs: number]: IInterval};

    constructor(server: Server) {
        this._server = server;
        this._schedule = {};
    }

    addBroadcast(everyMs: number, handler: WebSocketBroadcastHandler) {
        if (!(everyMs in this._schedule)) {
            const server = this._server;
            const schedule = this._schedule;
            schedule[everyMs] = {
                everyMs, handlers: [],
                interval: setInterval(() => {
                    server.sockets.forEach(id => {
                        schedule[everyMs].handlers.forEach(handle => {
                            expect(handle(id))
                                .then(payload => {
                                    if (payload != null) {
                                        server.send(id, payload);
                                    }
                                });
                        });
                    });
                }, everyMs)};
        }

        this._schedule[everyMs].handlers.push(handler);
    }
}

interface IInterval {
    everyMs: number;
    interval: any;
    handlers: WebSocketBroadcastHandler[];
}