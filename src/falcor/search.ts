import { of, Observable, from } from 'rxjs'
import { delay, mergeMap } from 'rxjs/operators'
import { PathValue, StandardRange } from 'falcor-router'
import { pipe, map, groupBy, values, any, propEq, uniq, prop } from 'ramda'
import { $error, ranges2List, $ref } from '../utils/falcor'
import { parseSearch } from '../utils/search'
import { searchPath, searchResultPath } from '../utils/juno';


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


export default (merged: MergedSearchRequest): Observable<PathValue> => from(merged).pipe(
  mergeMap(({ search, ranges, count }) => {
    const parsedSearch = parseSearch(search)
  
    if (parsedSearch === undefined) {
      return of({
        path: searchPath('juno', search),
        value: $error('422', 'Malformed Search Request')
      })
    }
  
    const searchResults = ranges2List(ranges).map((index) => ({
      path: searchResultPath('juno', search, index),
      value: $ref(['juno', 'resource', parsedSearch.type, `_${index}`])
    }))
  
    const countResults = count ? [{
      path: ['juno', 'search', search, 'length'],
      value: 100
    }] : []
  
    return of<PathValue>(
      ...searchResults,
      ...countResults,
    ).pipe(delay(100))
  })
)
