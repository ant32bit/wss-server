export interface IHttpResponse {
    statusCode: number;
    headers?: {[key: string]: string};
    body?: string | Buffer;
}

