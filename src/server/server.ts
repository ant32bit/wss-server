import * as fs from "fs";
import * as https from "https";
import * as http from "http";

import WebSocket, * as wss from "ws";
import { TLSSocket } from "tls";
import { HttpRouter } from "./http/http-router";
import { WebSocketRouter } from "./websockets/ws-router";
import { uuidv4 } from "../tools/uuid";
import { WebSocketData } from "./websockets/ws-data";

export interface IServerOptions {
    name?: string;
    port?: number;
    optionalRouters?: {
        webSockets?: WebSocketRouter
    };
    ssl?: {
       certificate: string;
       publicKey: string; 
    };
}

export class Server {

    private _httpRouter: HttpRouter;
    private _httpServer: http.Server | https.Server;

    private _webSocketRouter?: WebSocketRouter;
    private _webSocketServer?: wss.Server;
    private _webSocketConnections?: {[id: string]: WebSocket};

    public get sockets(): string[] {
        return this._webSocketConnections ? Object.keys(this._webSocketConnections) : [];
    }

    constructor(httpRouter: HttpRouter, options?: IServerOptions) {
        this._httpRouter = httpRouter;
        this._httpRouter.serverName = options?.name || 'J-Server 0.0';

        if (options?.ssl) {
            this._httpServer = https.createServer({
                cert: fs.readFileSync(options.ssl.certificate),
                key: fs.readFileSync(options.ssl.publicKey)
            }, this._httpRouter.handler);
        }
        else {
            this._httpServer = http.createServer(this._httpRouter.handler);
        }

        if (options?.optionalRouters?.webSockets) {
            this._webSocketRouter = options.optionalRouters.webSockets;
            this._webSocketServer = new wss.Server({ noServer: true });
            this._webSocketConnections = {};
            
            this._webSocketServer.on('connection', ws => {
                const id = uuidv4();
                this._webSocketConnections![id] = ws;
                ws.on('message', message => {
                    this._webSocketRouter!
                        .incoming(id, message)
                        .then(outgoing => {
                            if (outgoing)
                                ws.send(outgoing);
                        });
                });

                ws.on('close', () => {
                    delete this._webSocketConnections![id];
                });
            });
            
            const webSocketServer = this._webSocketServer;
            this._httpServer.on('upgrade', (request: http.IncomingMessage, socket: TLSSocket, head: Buffer) => {
                webSocketServer.handleUpgrade(request, socket, head, ws => {
                    webSocketServer.emit('connection', ws, request);
                });
            });
        }
        
        const port = options?.port || 8080
        this._httpServer.listen(port);
        console.log(`Server is listening on port ${port}`);
    }
    
    public async send(id: string, data: WebSocketData): Promise<void> {
        return new Promise<void>((res, rej) => {
            try {
                this._webSocketConnections![id].send(data, err => { if (err) rej(err); else res(); })
            }
            catch(err) {
                rej(err);
            }
        });
    }
}
    