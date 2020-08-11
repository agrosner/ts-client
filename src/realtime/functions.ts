import { formatISO } from 'date-fns';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import {
    apiEndpoint,
    isFixedDevice,
    host,
    httpRoute,
    invalidateToken,
    isMock,
    isOnline,
    isSecure,
    refreshAuthority,
    token,
    needsTokenHeader,
} from '../auth/functions';
import { log } from '../utilities/general';
import { HashMap } from '../utilities/types';
import { MockPlaceWebsocketModule } from './mock-module';
import { MockPlaceWebsocketSystem } from './mock-system';
import { mockSystem } from './mock';
import {
    PlaceCommandRequest,
    PlaceCommandRequestMetadata,
    PlaceDebugEvent,
    PlaceErrorCodes,
    PlaceExecRequestOptions,
    PlaceLogLevel,
    PlaceRequestOptions,
    PlaceResponse,
    SimpleNetworkError,
} from './interfaces';

/** Time in seconds to ping the server to keep the websocket connection alive */
const KEEP_ALIVE = 20;
/** Global counter for websocket request IDs */
let REQUEST_COUNT = 0;
/** Websocket for connecting to engine */
let _websocket: WebSocketSubject<any> | Subject<any> | undefined;
/** Request promises */
const _requests: { [id: string]: PlaceCommandRequestMetadata } = {};
/** Subjects for listening to values of bindings */
const _binding: { [id: string]: BehaviorSubject<any> } = {};
/** Observers for the binding subjects */
const _observers: { [id: string]: Observable<any> } = {};
/** Observers for the binding subjects */
const _listeners: { [id: string]: Subscription } = {};
/** BehaviorSubject holding the connection status of the websocket */
const _status = new BehaviorSubject<boolean>(false);
_observers._place_os_status = _status.asObservable();
/** Interval ID for the server ping callback */
let _keep_alive: number | undefined;
/** Number of connection attempts made before the session is established */
let _connection_attempts: number = 0;
/** Timer to check the initial health of the websocket connection */
let _health_check: number | undefined;

/** Listener for debugging events */
export const debug_events = new Subject<PlaceDebugEvent>();
_observers._place_os_debug_events = debug_events.asObservable();

/* istanbul ignore next */
/**
 * @ignore
 */
export function cleanupRealtime() {
    _websocket = undefined;
    REQUEST_COUNT = 0;
    for (const key in _binding) {
        if (_binding[key]) {
            delete _binding[key];
        }
    }
    for (const key in _observers) {
        if (_observers[key]) {
            delete _observers[key];
        }
    }
    _observers._place_os_status = _status.asObservable();
    for (const key in _listeners) {
        if (_listeners[key]) {
            delete _listeners[key];
        }
    }
    for (const key in _requests) {
        if (_requests[key]) {
            delete _requests[key];
        }
    }
    _status.next(false);
    clearInterval(_keep_alive);
    clearTimeout(_health_check);
}

export function websocketRoute() {
    return apiEndpoint().indexOf('control') >= 0
        ? '/control/websocket'
        : `${httpRoute()}/systems/control`;
}

/** Whether the websocket is connected */
export function is_connected(): boolean {
    return _status.getValue();
}

/**
 * Listen to websocket status changes
 */
export function status() {
    return _observers._place_os_status;
}

/**
 * Listen to binding changes on the given status variable
 * @param binding_details Binding details
 */
export function listen<T = any>(binding_details: PlaceRequestOptions): Observable<T>;
export function listen<T = any>(
    binding_details: PlaceRequestOptions,
    bindings: HashMap<BehaviorSubject<T>> = _binding,
    observers: HashMap<Observable<T>> = _observers
): Observable<T> {
    const key = `${binding_details.sys}|${binding_details.mod}_${binding_details.index}|${binding_details.name}`;
    /* istanbul ignore else */
    if (!bindings[key]) {
        bindings[key] = new BehaviorSubject<T>(null as any);
        observers[key] = bindings[key].asObservable();
    }
    return observers[key];
}

/**
 * Get current binding value
 * @param options Binding details
 */
export function value<T = any>(options: PlaceRequestOptions): T | undefined;
export function value<T = any>(
    options: PlaceRequestOptions,
    bindings: HashMap<BehaviorSubject<T>> = _binding
): T | void {
    const key = `${options.sys}|${options.mod}_${options.index}|${options.name}`;
    if (bindings[key]) {
        return bindings[key].getValue() as T;
    }
    return;
}

/**
 * Bind to status variable on the given system module
 * @param options Binding request options
 */
export function bind(options: PlaceRequestOptions): Promise<void>;
export function bind(
    options: PlaceRequestOptions,
    post: (_: PlaceCommandRequest) => Promise<void> = send
): Promise<void> {
    const request: PlaceCommandRequest = {
        id: ++REQUEST_COUNT,
        cmd: 'bind',
        ...options,
    };
    return post(request);
}

/**
 * Unbind from a status variable on the given system module
 * @param options Unbind request options
 */
export function unbind(options: PlaceRequestOptions): Promise<void>;
export function unbind(
    options: PlaceRequestOptions,
    post: (_: PlaceCommandRequest) => Promise<void> = send
): Promise<void> {
    const request: PlaceCommandRequest = {
        id: ++REQUEST_COUNT,
        cmd: 'unbind',
        ...options,
    };
    return post(request);
}

/**
 * Execute method on the given system module
 * @param options Exec request options
 */
export function execute(options: PlaceExecRequestOptions): Promise<void>;
export function execute<T = any>(
    options: PlaceExecRequestOptions,
    post: (_: PlaceCommandRequest) => Promise<T> = send
): Promise<T> {
    const request: PlaceCommandRequest = {
        id: ++REQUEST_COUNT,
        cmd: 'exec',
        ...options,
    };
    return post(request);
}

/**
 * Listen to debug logging for on the given system module binding
 * @param options Debug request options
 */
export function debug(options: PlaceRequestOptions): Promise<void>;
export function debug(
    options: PlaceRequestOptions,
    post: (_: PlaceCommandRequest) => Promise<void> = send
): Promise<void> {
    const request: PlaceCommandRequest = {
        id: ++REQUEST_COUNT,
        cmd: 'debug',
        ...options,
    };
    return post(request);
}

/**
 * Stop debug logging on the given system module binding
 * @param options Debug request options
 */
export function ignore(options: PlaceRequestOptions): Promise<void>;
export function ignore(
    options: PlaceRequestOptions,
    post: (_: PlaceCommandRequest) => Promise<void> = send
): Promise<void> {
    const request: PlaceCommandRequest = {
        id: ++REQUEST_COUNT,
        cmd: 'ignore',
        ...options,
    };
    return post(request);
}

/**
 * Send request to engine through the websocket connection
 * @param request New request to post to the server
 */
function send<T = any>(request: PlaceCommandRequest, tries: number = 0): Promise<T> {
    const key = `${request.cmd}|${request.sys}|${request.mod}${request.index}|${request.name}`;
    /* istanbul ignore else */
    if (!_requests[key]) {
        const req: PlaceCommandRequestMetadata = { ...request, key };
        req.promise = new Promise((resolve, reject) => {
            if (_websocket && is_connected()) {
                if (isMock()) {
                    handleMockSend(request, _websocket, _listeners);
                }
                req.resolve = resolve;
                req.reject = reject;
                const binding = `${request.sys}, ${request.mod}_${request.index}, ${request.name}`;
                log('WS', `[${request.cmd.toUpperCase()}](${request.id}) ${binding}`, request.args);
                _websocket.next(request);
            } else {
                connect().then(() => {
                    delete _requests[key];
                    send(request, tries).then(
                        (_) => resolve(_),
                        (_) => reject(_)
                    );
                });
            }
        });
        _requests[key] = req;
    }
    return _requests[key].promise as Promise<any>;
}

/**
 * Callback for messages from the server
 * @param message Message from the engine server
 */
function onMessage(message: PlaceResponse | 'pong'): void {
    if (message !== 'pong' && message instanceof Object) {
        if (message.type === 'notify' && message.meta) {
            let updated_value = message.value;
            try {
                updated_value = JSON.parse(message.value);
            } catch (e) {
                log('WS', '[ERROR] Unable to parse JSON in notify value');
            }
            handleNotify(message.meta, updated_value);
        } else if (message.type === 'success') {
            handleSuccess(message);
        } else if (message.type === 'debug') {
            log('WS', `[DEBUG] ${message.mod}${message.klass} →`, message.msg);
            const meta = message.meta || { mod: '', index: '' };
            debug_events.next({
                mod_id: message.mod || '<empty>',
                module: `${meta.mod}_${meta.index}`,
                class_name: message.klass || '<empty>',
                message: message.msg || '<empty>',
                level: message.level || PlaceLogLevel.Debug,
                time: Math.floor(new Date().getTime() / 1000),
            });
        } else if (message.type === 'error') {
            handleError(message);
        } else if (!(message as any).cmd) {
            // Not mock message
            log('WS', 'Invalid websocket message', message, 'error');
        }
    }
}

/**
 * Handle websocket success response
 * @param message Success message
 */
function handleSuccess(message: PlaceResponse) {
    const request = Object.keys(_requests)
        .map((i) => _requests[i])
        .find((i) => i.id === message.id);
    log('WS', `[SUCCESS](${message.id})`);
    /* istanbul ignore else */
    if (request && request.resolve) {
        request.resolve(message.value);
        delete _requests[request.key];
    }
}

/**
 * Handle websocket request error
 * @param message Error response
 */
function handleError(message: PlaceResponse) {
    let type = 'UNEXPECTED FAILURE';
    switch (message.code) {
        case PlaceErrorCodes.ACCESS_DENIED:
            type = 'ACCESS DENIED';
            break;
        case PlaceErrorCodes.BAD_REQUEST:
            type = 'BAD REQUEST';
            break;
        case PlaceErrorCodes.MOD_NOT_FOUND:
            type = 'MODULE NOT FOUND';
            break;
        case PlaceErrorCodes.SYS_NOT_FOUND:
            type = 'SYSTEM NOT FOUND';
            break;
        case PlaceErrorCodes.PARSE_ERROR:
            type = 'PARSE ERROR';
            break;
        case PlaceErrorCodes.REQUEST_FAILED:
            type = 'REQUEST FAILED';
            break;
        case PlaceErrorCodes.UNKNOWN_CMD:
            type = 'UNKNOWN COMMAND';
            break;
    }
    log('WS', `[ERROR] ${type}(${message.id}): ${message.msg}`, undefined, 'error');
    const request = Object.keys(_requests)
        .map((i) => _requests[i])
        .find((i) => i.id === message.id);
    if (request && request.reject) {
        request.reject(message);
        delete _requests[request.key];
    }
}

/**
 * Update the current value of the binding
 * @param options Binding details
 * @param updated_value New binding value
 */
function handleNotify<T = any>(
    options: PlaceRequestOptions,
    updated_value: T,
    bindings: HashMap<BehaviorSubject<T>> = _binding,
    observers: HashMap<Observable<T>> = _observers
): void {
    const key = `${options.sys}|${options.mod}_${options.index}|${options.name}`;
    if (!bindings[key]) {
        bindings[key] = new BehaviorSubject<T>(null as any);
        observers[key] = bindings[key].asObservable();
    }
    const binding = `${options.sys}, ${options.mod}_${options.index}, ${options.name}`;
    log('WS', `[NOTIFY] ${binding} changed`, [bindings[key].getValue(), '→', updated_value]);
    bindings[key].next(updated_value);
}

/**
 * Connect to engine websocket
 */
function connect(tries: number = 0): Promise<void> {
    return new Promise<void>((resolve) => {
        _connection_attempts++;
        _websocket = isMock() ? createMockWebSocket() : createWebsocket();
        if (_websocket && (token() || isMock()) && isOnline()) {
            _websocket.subscribe(
                (resp: PlaceResponse) => {
                    if (!_status.getValue()) {
                        resolve();
                        _status.next(true);
                    }
                    _connection_attempts = 0;
                    clearHealthCheck();
                    onMessage(resp);
                },
                (err: SimpleNetworkError) => {
                    clearHealthCheck();
                    onWebSocketError(err);
                },
                () => _status.next(false)
            );
            if (_keep_alive) {
                clearInterval(_keep_alive);
            }
            ping();
            _keep_alive = setInterval(() => ping(), KEEP_ALIVE * 1000) as any;
            clearHealthCheck();
            _health_check = setTimeout(() => {
                log('WS', 'Unhealthy connection. Reconnecting...');
                _status.next(false);
                reconnect();
            }, 30 * 1000) as any;
        } else {
            /* istanbul ignore else */
            if (!_websocket) {
                log('WS', `Failed to create websocket(${tries}). Retrying...`, undefined, 'error');
            }
            setTimeout(async () => resolve(await connect(tries)), 300 * Math.min(20, ++tries));
        }
    });
}

/**
 * Create websocket connection
 */
function createWebsocket() {
    const secure = isSecure() || location.protocol.indexOf('https') >= 0;
    const expiry = `expires=${formatISO(Math.floor(new Date().getTime() / 1000 + 120))};`;
    let url = `ws${secure ? 's' : ''}://${host()}${websocketRoute()}${
        isFixedDevice() ? '?fixed_device=true' : ''
    }`;
    if (!needsTokenHeader()) {
        document.cookie = `bearer_token=${token()}; ${expiry} path=${httpRoute()}; ${
            secure ? 'Secure;' : ''
        } SameSite=Strict`;
    } else {
        url += `${url.indexOf('?') >= 0 ? '&' : '?'}bearer_token=${token()}`;
    }
    log('WS', `Connecting to ws${secure ? 's' : ''}://${host()}${websocketRoute()}`);
    /* istanbul ignore next */
    return webSocket<any>({
        url,
        serializer: (data) => (typeof data === 'object' ? JSON.stringify(data) : data),
        deserializer: (data) => {
            let return_value = data.data;
            try {
                const obj = JSON.parse(data.data);
                return_value = obj;
            } catch (e) {
                return_value = return_value;
            }
            return return_value;
        },
    });
}

/**
 * Close old websocket connect and open a new one
 */
function reconnect() {
    /* istanbul ignore else */
    if (_websocket && is_connected) {
        _websocket.complete();
        /* istanbul ignore else */
        if (_keep_alive) {
            clearInterval(_keep_alive);
            _keep_alive = undefined;
        }
    }
    setTimeout(() => connect(), Math.min(5000, _connection_attempts * 300 || 1000));
}

/**
 * Send ping through the websocket
 */
function ping() {
    _websocket!.next('ping');
}

/**
 * Handle errors on the websocket
 * @param err Network error response
 */
function onWebSocketError(err: SimpleNetworkError) {
    _status.next(false);
    log('WS', 'Websocket error:', err, undefined, 'error');
    /* istanbul ignore else */
    if (err.status === 401) {
        invalidateToken();
    }
    refreshAuthority();
    // Try reconnecting after 1 second
    reconnect();
}

/**
 * Clear health check timer
 */
function clearHealthCheck() {
    if (_health_check) {
        clearTimeout(_health_check);
        _health_check = undefined;
    }
}

/**
 * Connect to engine websocket
 */
function createMockWebSocket() {
    const websocket = new Subject<PlaceResponse | PlaceCommandRequest>();
    websocket.subscribe((resp: PlaceResponse | PlaceCommandRequest) =>
        onMessage(resp as PlaceResponse)
    );
    return websocket;
}

/**
 * Send request to engine through the websocket connection
 * @param request New request to post to the server
 */
function handleMockSend(
    request: PlaceCommandRequest,
    websocket: Subject<any>,
    listeners: HashMap<Subscription>
) {
    const key = `${request.sys}|${request.mod}_${request.index}|${request.name}`;
    const system: MockPlaceWebsocketSystem = mockSystem(request.sys);
    const module: MockPlaceWebsocketModule =
        system && system[request.mod] ? system[request.mod][request.index - 1 || 0] : null;
    if (module) {
        switch (request.cmd) {
            case 'bind':
                listeners[key] = module.listen(request.name).subscribe((new_value) => {
                    setTimeout(
                        () => {
                            websocket.next({
                                type: 'notify',
                                value: new_value,
                                meta: request,
                            });
                        },
                        Math.floor(Math.random() * 100 + 50) // Add natural delay before response
                    );
                });
                break;
            case 'unbind':
                /* istanbul ignore else */
                if (listeners[key]) {
                    listeners[key].unsubscribe();
                    delete listeners[key];
                }
                break;
        }
        setTimeout(() => {
            const resp = {
                id: request.id,
                type: 'success',
                value: request.cmd === 'exec' ? module.call(request.name, request.args) : null,
            } as PlaceResponse;
            websocket.next(resp);
        }, 10);
    } else {
        // Error determining system or module
        setTimeout(
            () =>
                websocket.next({
                    id: request.id,
                    type: 'error',
                    code: system ? PlaceErrorCodes.SYS_NOT_FOUND : PlaceErrorCodes.MOD_NOT_FOUND,
                } as PlaceResponse),
            10
        );
    }
}