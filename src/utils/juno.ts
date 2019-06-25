import { xprod as ramda_xprod } from 'ramda'
import { KeySet, PathValue } from 'falcor-json-graph'
import { Observable, from, Subject, ReplaySubject } from 'rxjs'
import { tap, catchError, toArray, mergeMap, multicast, refCount } from 'rxjs/operators'
import { $error } from './falcor'


export const noop = () => {}


export const xprod = <A, B, C>(ax: A[], bx: B[], cx: C[]) => ramda_xprod(ax, bx)
  .reduce<Array<[A, B, C]>>((acc, abProd: [A, B]) => {
    const abcProd = cx.map((c) => [...abProd, c] as [A, B, C])
    acc.push(...abcProd)
    return acc
  }, [])


export const handleError = (
  expectedPaths: KeySet[],
  errorMessage: (err: any) => string = (err: any) => process.env.NODE_ENV === 'development' ? err : 'Error'
) => (stream$: Observable<PathValue>) => {
  const seenPaths: Set<KeySet> = new Set()

  return stream$.pipe(
    tap((pathValue) => seenPaths.add(pathValue.path)),
    catchError((err) => {
      console.error(err)
      const message = errorMessage(err)

      return from(expectedPaths
        .filter((path) => !seenPaths.has(path))
        .map((path) => ({
          path,
          value: $error('500', message)
        }))
      )
    })
  )
}


/**
 * [graph, "search", search]
 * 
 * ["juno", "search", "type=person"]
 */
export const searchPath = (graph: string, search: string) => [graph, 'search', search]
/**
 * [graph, "search", search, "length"]
 * 
 * ["juno", "search", "type=person", "length"]
 */
export const searchLengthPath = (graph: string, search: string) => [graph, 'search', search, 'length']
/**
 * [graph, "search", search, index, "value"]
 * 
 * ["juno", "search", "type=person", 0, "value"]
 */
export const searchResultPath = (graph: string, search: string, index: number) => [graph, 'search', search, index, 'value']
/**
 * [graph, "search", search, index, "qualifier"]
 * 
 * ["juno", "search", "type=person", 0, "qualifier"]
 */
export const searchResultQualifierPath = (graph: string, search: string, index: number) => [graph, 'search', search, index, 'qualifier']
/**
 * [graph, "resource", type, resource]
 * 
 * ["juno", "resource", "person", "_1"]
 */
export const resourcePath = (graph: string, type: string, resource: string) => [graph, 'resource', type, resource]
/**
 * [graph, "resource", type, resource, field]
 * 
 * ["juno", "resource", "person", "_1", "name"]
 */
export const resourceFieldPath = (graph: string, type: string, resource: string, field: string) => [graph, 'resource', type, resource, field]
/**
 * [graph, "resource", type, resource, resource, field, index, "value"]
 * 
 * ["juno", "resource", "person", "_1", "name", 0, "value"]
 */
export const resourceFieldValuePath = (graph: string, type: string, resource: string, field: string, index: number) => [graph, 'resource', type, resource, field, index, 'value']
/**
 * [graph, "resource", type, resource, resource, field, index, "qualifier"]
 * 
 * ["juno", "resource", "person", "_1", "name", 0, "qualifier"]
 */
export const resourceFieldValueQualifierPath = (graph: string, type: string, resource: string, field: string, index: number) => [graph, 'resource', type, resource, field, index, 'qualifier']
/**
 * [graph, "resource", type, resource, resource, field]
 * 
 * ["juno", "resource", "person", "_1", "name", "length"]
 */
export const resourceFieldLengthPath = (graph: string, type: string, resource: string, field: string) => [graph, 'resource', type, resource, field, 'length']


export const batch = <Request, Merged>(
  merge: (reqs: Request[]) => Merged,
  handler: (mergedRequests: Merged) => Observable<PathValue>,
  tapMergedRequests: (mergedRequests: Merged) => void = noop
) => {
  let request$: Subject<Request> | undefined
  let response$: Observable<PathValue> | undefined

  return (req: Request): Observable<PathValue> => {
    if (request$ === undefined) {
      request$ = new ReplaySubject<Request>()
      response$ = request$.pipe(
        toArray(),
        mergeMap((reqs) => {
          const merged = merge(reqs)
          tapMergedRequests(merged)
          return handler(merged)
        }),
        multicast(new Subject()),
        refCount(),
      )

      setTimeout(() => {
        request$!.complete()
        request$ = undefined
        response$ = undefined
      }, 0)
    }

    request$.next(req)
    return response$!
  }
}

// the above should be possible with a RxJS-only solution
// export const batch = <Request, Merged>(
//   merge: (reqs: Request[]) => Merged,
//   handler: (mergedRequests: Merged) => Observable<PathValue>,
// ) => {
//   const request$ = new Subject<Request>()
//   const batchedRequest$ = request$.pipe(bufferTime(0))

//   return (req: Request, tapMergedRequests: (mergedRequests: Merged) => void = noop): Observable<PathValue> => {
//     request$.next(req)

//     return batchedRequest$.pipe(
//       take(1),
//       map((reqs) => {
//         const merged = merge(reqs)
//         tapMergedRequests(merged)
//         return handler(merged)
//       }),
//       switchAll()
//     )
//   }
// }
