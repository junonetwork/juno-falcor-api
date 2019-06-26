import { MergedSearchRequest } from './index'
import { of, Observable, from } from 'rxjs'
import { $error, ranges2List, $ref } from '../utils/falcor'
import { delay, mergeMap } from 'rxjs/operators'
import { parseSearch } from '../utils/search'
import { PathValue } from 'falcor-router'
import { searchPath, searchResultPath } from '../utils/juno';


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
