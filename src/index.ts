import { HttpRouter, HttpRoute, Server, HttpRequest, WebSocketRoute, WebSocketData, WebSocketRouter, HttpFileRoutes, WebSocketBroadcaster, WebSocketDataBuilder } from "./server";

const homeRoute = new HttpRoute( '/', (request: HttpRequest) => ({ statusCode: 200, body: "Hello World!"}));
const router = new HttpRouter()
    .addRoute(homeRoute);

const fileRouter = new HttpFileRoutes('content');
router.defaultRouteHandler = fileRouter.routeHandler;

const reverseRoute = new WebSocketRoute(
    (incoming: WebSocketData) => true,
    (incoming: WebSocketData) => { 
        console.log('Received: ' + incoming); 
        return incoming.toString().split('').reverse().join(''); 
    }
);
const wsRouter = new WebSocketRouter()
    .addRoute(reverseRoute);

const server = new Server(router, {
    name: 'Test J-Server',
    port: 8080,
    ssl: {
        certificate: 'certificate/cert.pem',
        publicKey: 'certificate/key.pem'
    },
    optionalRouters: {
        webSockets: wsRouter
    }
});

const broadcaster = new WebSocketBroadcaster(server);
broadcaster.addBroadcast(1000, id => {
    const builder = new WebSocketDataBuilder();
    builder.writeNumber('us', 33405);
    return builder.build();
});

