import { xprod as ramda_xprod } from 'ramda'
import { PathValue } from 'falcor-router';
import { Observable, Subject, ReplaySubject } from 'rxjs'
import { toArray, mergeMap, multicast, refCount, delay } from 'rxjs/operators'


export const noop = () => {}


export const xprod = <A, B, C>(ax: A[], bx: B[], cx: C[]) => ramda_xprod(ax, bx)
  .reduce<Array<[A, B, C]>>((acc, abProd: [A, B]) => {
    const abcProd = cx.map((c) => [...abProd, c] as [A, B, C])
    acc.push(...abcProd)
    return acc
  }, [])


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
 * [graph, "resource", type, resource, field, index, "value"]
 * 
 * ["juno", "resource", "person", "_1", "name", 0, "value"]
 */
export const resourceFieldValuePath = (graph: string, type: string, resource: string, field: string, index: number) => [graph, 'resource', type, resource, field, index, 'value']
/**
 * [graph, "resource", type, resource, field, index, "qualifier"]
 * 
 * ["juno", "resource", "person", "_1", "name", 0, "qualifier"]
 */
export const resourceFieldValueQualifierPath = (graph: string, type: string, resource: string, field: string, index: number) => [graph, 'resource', type, resource, field, index, 'qualifier']
/**
 * [graph, "resource", type, resource, field, "length"]
 * 
 * ["juno", "resource", "person", "_1", "name", "length"]
 */
export const resourceFieldLengthPath = (graph: string, type: string, resource: string, field: string) => [graph, 'resource', type, resource, field, 'length']
/**
 * [graph, "resource", type, resource, "label"]
 * 
 * ["juno", "resource", "person", "_1", "label"]
 */
export const resourceLabelPath = (graph: string, type: string, resource: string) => [graph, 'resource', type, resource, 'label']


export const batch = <Request, Merged>(
  merge: (reqs: Request[]) => Merged,
  handler: (mergedRequests: Merged) => Observable<PathValue | PathValue[]>,
  tapMergedRequests: (mergedRequests: Merged) => void = noop
) => {
  let request$: Subject<Request> | undefined
  let response$: Observable<PathValue | PathValue[]> | undefined

  return (req: Request): Observable<PathValue | PathValue[]> => {
    if (request$ === undefined) {
      request$ = new ReplaySubject<Request>()
      response$ = request$.pipe(
        toArray(),
        mergeMap((reqs) => {
          const merged = merge(reqs)
          tapMergedRequests(merged)

          /**
           * TODO - why are parts of deep responses lost when emits are synchronous?  i.e. w/o delay(0)
           * {{BASE_URL}}/model.json?method=get&paths=[["juno", "resource", "person", "_0", ["birthDate", "shareholderOf", "nationality"], 0, "value", "label"], ["juno", "resource", "person", "_0", ["birthDate", "shareholderOf", "nationality"], "length"], ["juno", "resource", "person", "_2", "shareholderOf", "length"], ["juno", "resource", "person", "_2", "shareholderOf", { "to": 1 }, "value", "label"], ["juno", "resource", "person", "_2", "shareholderOf", { "to": 1 }, "value", ["name", "shareholderOf"], 0, "value", "label"]]
           */
          return handler(merged).pipe(delay(0))
        }),
        multicast<PathValue | PathValue[]>(new Subject()),
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


export const bufferSynchronous = () => {
  let interval: NodeJS.Timeout
  let buffer: PathValue[]

  return (stream$: Observable<PathValue | PathValue[]>): Observable<PathValue[]> => {
    return new Observable((observer) => {
      return stream$.subscribe({
        next: (data) => {
          if (buffer === undefined) {
            buffer = []
            interval = setTimeout(() => {
              observer.next(buffer)
              buffer = []
            }, 0)
          }

          if (Array.isArray(data)) {
            buffer.push(...data)
          } else {
            buffer.push(data)
          }
        },
        error: observer.error.bind(observer),
        complete: () => {
          if (buffer !== undefined) {
            observer.next(buffer)
            clearInterval(interval)
          }

          observer.complete()
        },
      })
    })
  }
}
