declare module 'falcor-router' {
  import {
    Path,
    PathSet,
    InvalidPath,
    JSONGraph,
    JSONEnvelope,
    JSONGraphEnvelope,
  } from 'falcor-json-graph';
  import { Observable } from 'rxjs';

  export {
    Path,
    PathSet,
    InvalidPath,
    JSONGraph,
    JSONEnvelope,
    JSONGraphEnvelope,
  }

  export type RouterOptions = {
    debug?: boolean;
    maxPaths?: number;
    maxRefFollow?: number;
  }

  export class DataSource {
    /**
     * The get method retrieves values from the DataSource's associated JSONGraph object.
     */
    get(pathSets: PathSet[]): Observable<JSONGraphEnvelope>;

    /**
     * The set method accepts values to set in the DataSource's associated JSONGraph object.
     */
    set(jsonGraphEnvelope: JSONGraphEnvelope): Observable<JSONGraphEnvelope>;

    /**
     * Invokes a function in the DataSource's JSONGraph object.
     */
    call(functionPath: Path, args?: any[], refSuffixes?: PathSet[], thisPaths?: PathSet[]): Observable<JSONGraphEnvelope>;
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

  export type Primitive = string | boolean | number | undefined | null;

  export type Atom<T = any> = { $type: 'atom', value: T, $language?: string, $dataType?: string }

  export type Ref = { $type: 'ref', value: Path }

  export type ErrorSentinel = { $type: 'error', value: { code: string, message: string } }

  export type Sentinel = Atom | Ref | ErrorSentinel

  export type PathValue<Value = any> = {
    path: string | PathSet
    value: Value | Atom<Value> | Ref | ErrorSentinel
  }

  export type StandardRange = {
    from: number
    to: number
  }
}
