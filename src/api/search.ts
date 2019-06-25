import { MergedSearchRequest } from './index'
import { of, Observable, from } from 'rxjs'
import { $error, ranges2List, $ref } from '../utils/falcor'
import { delay, mergeMap } from 'rxjs/operators'
import { parseSearch } from '../utils/search'
import { PathValue } from 'falcor-router'


export default (merged: MergedSearchRequest): Observable<PathValue> => from(merged).pipe(
  mergeMap(({ searchId, ranges, count }) => {
    const search = parseSearch(searchId)
  
    if (search === undefined) {
      return of({
        path: ['juno', 'search', searchId],
        value: $error('422', 'Malformed Search Request')
      })
    }
  
    const searchResults = ranges2List(ranges).map((index) => ({
      path: ['juno', 'search', searchId, index],
      value: $ref(['juno', 'resource', search.type, `_${index}`])
    }))
  
    const countResults = count ? [{
      path: ['juno', 'search', searchId, 'length'],
      value: 100
    }] : []
  
    return of<PathValue>(
      ...searchResults,
      ...countResults,
    ).pipe(delay(100))
  })
)
