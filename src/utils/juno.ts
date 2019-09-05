import { xprod as ramdaXprod } from 'ramda'
import { PathValue } from 'falcor-router'
import { Observable, Subject, ReplaySubject, of } from 'rxjs'
import { toArray, mergeMap, multicast, refCount, delay } from 'rxjs/operators'


export const noop = () => {}


export const xprod = <A, B, C>(ax: A[], bx: B[], cx: C[]) => ramdaXprod(ax, bx)
  .reduce<Array<[A, B, C]>>((acc, abProd) => {
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
 * [graph, "resource", type, id]
 * 
 * ["juno", "resource", "person", "_1"]
 */
export const resourcePath = (graph: string, type: string, id: string) => [graph, 'resource', type, id]
/**
 * [graph, "resource", type, id, field]
 * 
 * ["juno", "resource", "person", "_1", "name"]
 */
export const resourceFieldPath = (graph: string, type: string, id: string, field: string) => [graph, 'resource', type, id, field]
/**
 * [graph, "resource", type, id, field, index, "value"]
 * 
 * ["juno", "resource", "person", "_1", "name", 0, "value"]
 */
export const resourceFieldValuePath = (graph: string, type: string, id: string, field: string, index: number) => [graph, 'resource', type, id, field, index, 'value']
/**
 * [graph, "resource", type, id, field, index, "qualifier"]
 * 
 * ["juno", "resource", "person", "_1", "name", 0, "qualifier"]
 */
export const resourceFieldValueQualifierPath = (graph: string, type: string, id: string, field: string, index: number) => [graph, 'resource', type, id, field, index, 'qualifier']
/**
 * [graph, "resource", type, id, field, "length"]
 * 
 * ["juno", "resource", "person", "_1", "name", "length"]
 */
export const resourceFieldLengthPath = (graph: string, type: string, id: string, field: string) => [graph, 'resource', type, id, field, 'length']
/**
 * [graph, "resource", type, id, "label"]
 * 
 * ["juno", "resource", "person", "_1", "label"]
 */
export const resourceLabelPath = (graph: string, type: string, id: string) => [graph, 'resource', type, id, 'label']
/**
 * [graph, "filter", type, filter, index]
 * 
 * ["juno", "filter", "country", "russ", 0]
 */
export const resourceFilterPath = (graph: string, type: string, filter: string, index: number) => [graph, 'filter', type, filter, index]
/**
 * [graph, "filter", type, filter, "length"]
 * 
 * ["juno", "filter", "country", "russ", "length"]
 */
export const resourceFilterLengthPath = (graph: string, type: string, filter: string) => [graph, 'filter', type, filter, 'length']


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

      setImmediate(() => {
        request$!.complete()
        request$ = undefined
        response$ = undefined
      })
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
  let interval: NodeJS.Immediate
  let buffer: PathValue[] | undefined

  return (
    stream$: Observable<PathValue | PathValue[]>
  ): Observable<PathValue[]> => (
    new Observable((observer) => (
      stream$.subscribe({
        next: (data) => {
          if (buffer === undefined) {
            buffer = []
            interval = setImmediate(() => { // should this be implemented via process.nextTick?
              observer.next(buffer)
              buffer = undefined
            })
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
            buffer = undefined
            clearImmediate(interval)
          }

          observer.complete()
        },
      })
    ))
  )
}


export const padByStatic = <T, S>(
  stream$: Observable<T>,
  expected: S[],
  selector: (data: T) => S,
) => {
  const missing = new Set(expected)
  const missing$ = new Subject<S[]>()

  return [
    new Observable((observer) => stream$.subscribe({
      next: (data) => {
        missing.delete(selector(data))
        observer.next(data)
      },
      error: (err) => {
        observer.error(err)
        missing$.error(err)
      },
      complete: () => {
        missing$.next(Array.from(missing))
        observer.complete()
        missing$.complete()
      },
    })),
    missing$
  ] as [Observable<T>, Observable<S[]>]
}


export const padBy = <T, S>(
  expected: S[],
  selector: (data: T) => S | S[],
) => {
  const missing = new Set(expected)
  const missing$ = new ReplaySubject<S[]>()

  return (stream$: Observable<T>): Observable<[Observable<T>, Observable<S[]>]> => of([
    new Observable<T>((observer) => stream$.subscribe({
      next: (data) => {
        const seen = selector(data)
        if (Array.isArray(seen)) {
          seen.forEach(missing.delete.bind(missing))
        } else {
          missing.delete(seen)
        }
        observer.next(data)
      },
      error: (err) => observer.error(err),
      complete: () => {
        observer.complete()
        missing$.next(Array.from(missing))
        missing$.complete()
      },
    })),
    missing$,
  ])
}
