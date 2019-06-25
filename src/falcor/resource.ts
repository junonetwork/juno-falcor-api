import { from, Observable } from 'rxjs'
import { delay, mergeMap } from 'rxjs/operators'
import { MergedResourceRequest } from './index'
import { ranges2List, $atom, $ref } from '../utils/falcor'
import { PathValue } from 'falcor-router'
import { xprod } from 'ramda'
import { resourceFieldValuePath, resourceFieldLengthPath } from '../utils/juno';


export default (request: MergedResourceRequest): Observable<PathValue> => {
  return from(Object.keys(request)).pipe(
      mergeMap((type) => xprod(request[type].resources, request[type].fields)
        .reduce<PathValue[]>((acc, [resource, field]) => {
          const resourceResult: PathValue[] = field === 'birthDate' ?
            ranges2List(request[type].ranges).map((index) => ({
              path: resourceFieldValuePath('juno', type, resource, 'birthDate', index),
              value: index === 0 ? $atom(`1980-10-10`, { dataType: 'date' }) : null,
            })) :
          field === 'shareholderOf' ?
            ranges2List(request[type].ranges).map((index) => ({
              path: resourceFieldValuePath('juno', type, resource, 'shareholderOf', index),
              value: index < 5 ? $ref(['juno', 'resource', 'company', `_${index}:shareholder`]) : null,
            })) :
          field === 'nationality' ?
            ranges2List(request[type].ranges).map((index) => ({
              path: resourceFieldValuePath('juno', type, resource, 'nationality', index),
              value: index === 0 ? $ref(['juno', 'resource', 'country', 'gbr']) : null,
            })) :
            ranges2List(request[type].ranges).map((index) => ({
              path: resourceFieldValuePath('juno', type, resource, field, index),
              value: $atom(`${field} value ${index}`),
            }))

          acc.push(...resourceResult)
          if (request[type].count) {
            acc.push({
              path: resourceFieldLengthPath('juno', type, resource, field),
              value: field === 'shareholderOf' ? 5 : 1,
            })
          }

          return acc
        }, []))
    ).pipe(delay(100))
}
