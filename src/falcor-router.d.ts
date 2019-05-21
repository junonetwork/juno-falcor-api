declare module 'falcor-router' {
  import { DataSource } from 'falcor';
  import {
    PathSet,
    InvalidPath,
    JSONGraph,
    JSONEnvelope,
    JSONGraphEnvelope,
    Path
  } from 'falcor-json-graph';
  import { Observable } from 'rxjs';

  export type RouterOptions = {
    debug?: boolean;
    maxPaths?: number;
    maxRefFollow?: number;
  }

  export default class AbstractRouter extends DataSource {

    constructor(routes: Array<Route>, options?: RouterOptions);
    
    /**
     * When a route misses on a call, get, or set the unhandledDataSource will
     * have a chance to fulfill that request.
     **/
    public routeUnhandledPathsTo(dataSource: DataSource): void;
    
    // static createClass(routes?: Array<Route>): typeof Router;
    static createClass<T = Route>(routes: T[]): typeof Router
  }

  export class Router extends AbstractRouter {
    constructor(options?: RouterOptions);
  }

  export type GetRoute<P extends PathSet = PathSet, C = Router> = {
    route: string
    get(this: C, pathset: P): PathValue | PathValue[] | Promise<PathValue | PathValue[]> | Observable<PathValue | PathValue[]>
  }

  export type SetRoute<C = Router> = {
    route: string
    set(this: C, jsonGraph: JSONGraph): PathValue | PathValue[] | Promise<PathValue | PathValue[]> | Observable<PathValue | PathValue[]>
  }

  export type CallRoute<P extends PathSet = PathSet, C = Router> = {
    route: string
    call(this: C, callPath: P, args: Array<any>): CallRouteResult | Promise<CallRouteResult> | Observable<CallRouteResult>
  }

  export type CallRouteResult = PathValue | InvalidPath | Array<PathValue | InvalidPath> | JSONGraphEnvelope;

  export type Route<P extends PathSet = PathSet, C = Router> = GetRoute<P, C> | SetRoute<C> | CallRoute<P, C>;

  export type Primitive = string | boolean | number | undefined;

  export type Atom<T = any> = { $type: 'atom', value: T, $lang?: string, $dataType?: string }

  export type Ref = { $type: 'ref', value: Path }

  export type ErrorSentinel = { $type: 'error', value: { code: string, message: string } }

  export type Sentinel = Atom | Ref | ErrorSentinel

  export type PathValue = {
    path: string | PathSet
    value: Sentinel | Primitive
  }

  export type StandardRange = {
    from: number
    to: number
  }
}
