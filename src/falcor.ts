import Router, { Route, StandardRange } from 'falcor-router'
import { from, of, Observable, empty, Subject } from 'rxjs'
import {
  mergeMap,
  map,
  bufferTime,
  distinct,
} from 'rxjs/operators'
import { parseSearch } from './utils/search'
import { $error, $ref, $atom } from './utils/falcor'
import { Search, SearchResponse, ResourceResponse, ApiResponse, SearchCountResponse, ResourceCountResponse } from './types'

const api = {
  search: (search: Search, ranges: StandardRange[]): Observable<SearchResponse> => {
    return empty()
  },
  resources: (resources: string[], fields: string[], ranges: StandardRange[]): Observable<ResourceResponse> => {
    return empty()
  }
}

class Api {
  private subject: Subject<ApiResponse>

  constructor() {
    this.subject = new Subject();

    this.subject.pipe(

    )
  }

  search(search: Search, ranges: StandardRange[]): Observable<SearchResponse | SearchCountResponse> {
    // this.subject.next({ search, ranges });

    // return this.subject.pipe(
    //   filter(), // filter for SearchResponse | SearchCountResponse
    //   map() // transform
    // );

    return empty();
  }

  resources(resources: string[], fields: string[], ranges: StandardRange[]): Observable<ResourceResponse | ResourceCountResponse> {
    return empty();
  }
}

const Search = () => {
  const subject = new Subject().pipe(
    distinct()
  );

  return (search: Search, ranges: StandardRange[]): Observable<SearchResponse | SearchCountResponse> => {

  }
}

const Resources = () => {
  const subject = new Subject().pipe(
    distinct()
  );

  return (search: Search, ranges: StandardRange[]): Observable<SearchResponse | SearchCountResponse> => {

  }
}


/**
 * strategies for resolving multiple paths with a single call to the upstream backing service:
 * - reduce all path requests into a merged data type that can be resolved more efficiently (e.g. juno-falcor-router)
 * - ensure api handler can be called multiple times w/ same parameters and only issue single request (rxjs should be able to do this: first call results in upstream api call, subsequent calls wait on that first call, until it resolves)
 */
const FalcorRouter = Router.createClass([
  {
    route: 'graph.sayari.search[{keys:searches}][{ranges:ranges}]',
    get([_, __, ___, searches, ranges]) {
      return from(searches).pipe(
        mergeMap((searchKey) => {
          const search = parseSearch(searchKey)

          if (search === undefined) {
            return of({
              path: ['graph', 'sayari', 'search', searchKey],
              value: $error('422', 'Malformed Search Request')
            })
          }

          return api.search(search, ranges)
            .pipe(map(({ index, id }) => ({
              path: ['graph', 'sayari', 'search', searchKey, index],
              value: id === undefined ? undefined : $ref(['resource', id])
            })))
        }),
        bufferTime(0)
      )
    },
  } as Route<[string, string[], string, string[], StandardRange[]]>,
  {
    route: 'graph.sayari.search[{keys:searches}].length',
    get([_, graphKeys, __, searches]) {
      return from(searches).pipe(
        mergeMap((searchKey) => {
          const search = parseSearch(searchKey)

          if (search === undefined) {
            return of({
              path: ['graph', 'sayari', 'search', searchKey],
              value: $error('422', '')
            })
          }

          return api.search(search, [{ from: 0, to: 0 }]).pipe(
            map(({ count }) => ({
              path: ['graph', 'sayari', 'search', searchKey, 'length'],
              value: count
            }))
          )
        }),
        bufferTime(0)
      )
    }
  } as Route<[string, string[], string, string[]], StandardRange>,
  {
    route: 'resource[{keys:resources}][{keys:fields}][{ranges:ranges}]',
    get([_, resources, fields, ranges]) {
      return api.resources(resources, fields, ranges).pipe(
        bufferTime(0)
      )
    },
  } as Route<[string, string[], string[], StandardRange[]]>,
  {
    route: 'resource[{keys:subjects}][{keys:fields}].length',
    get([_, subjects, fields]) {
      return from(subjects).pipe(
        mergeMap(({ handler, subjects }) => handler({ type: 'triple-count', subjects, fields })),
        map(({ subject, predicate, count }) => ({
          path: ['resource', subject, predicate, 'length'],
          value: $atom(count),
        })),
        bufferTime(0)
      )
    }
  } as Route<[string, string[], string[]]>,
])

export default () => new FalcorRouter()
