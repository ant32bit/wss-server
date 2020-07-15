export async function expect<T>(maybePromise: T | Promise<T>): Promise<T> {
    return maybePromise instanceof Promise ? await maybePromise : maybePromise;
}

