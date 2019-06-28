import { of, Observable, from, identity } from 'rxjs'
import { delay, mergeMap, endWith, map as mapRx } from 'rxjs/operators'
import { PathValue, StandardRange } from 'falcor-router'
import { pipe, map, groupBy, values, any, propEq, uniq, prop } from 'ramda'
import { $error, ranges2List, $ref } from '../utils/falcor'
import { parseSearch } from '../utils/search'
import { searchPath, searchResultPath, searchLengthPath, padMissing } from '../utils/juno';


export type SearchRequest = { type: 'search', search: string, ranges: StandardRange[] }
export type SearchCountRequest = { type: 'search-count', search: string }
export type MergedSearchRequest = Array<{ search: string, ranges: StandardRange[], count: boolean }>


export const mergeSearchRequests: (reqs: Array<SearchRequest | SearchCountRequest>) => MergedSearchRequest = pipe(
  groupBy<SearchRequest | SearchCountRequest>(prop('search')),
  values,
  map((reqs) => ({
    search: reqs[0].search,
    ranges: uniq(
      reqs.reduce<StandardRange[]>((acc, req) => (req.type === 'search' && acc.push(...req.ranges), acc), [])
    ), // TODO - merge ranges, rather than simply concatenating
    count: any(propEq('type', 'search-count'), reqs),
  }))
)


export default (merged: MergedSearchRequest): Observable<PathValue | PathValue[]> => from(merged).pipe(
  mergeMap(({ search, ranges, count }) => {
    const parsedSearch = parseSearch(search)
  
    if (parsedSearch === undefined) {
      return of({
        path: searchPath('juno', search),
        value: $error('422', 'Malformed Search Request')
      })
    }
  
    const indices = ranges2List(ranges)


    return from(indices
      .filter((index) => index < 25)
      .map((index) => ({ index, id: `_${index}` }))
    ).pipe(
      padMissing<{ index: number, id: string}, PathValue, number>(
        indices,
        prop('index'),
        (result$) => result$.pipe(mapRx(({ index, id }) => ({
          path: searchResultPath('juno', search, index),
          value: $ref(['juno', 'resource', parsedSearch.type, id])
        }))),
        (missing) => from(missing.map((index) => ({
          path: searchResultPath('juno', search, index),
          value: null
        })))
      ),
      count ? endWith({
        path: searchLengthPath('juno', search),
        value: 25
      }) : identity
    )
  }),
  delay(100)
)
