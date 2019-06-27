import { from, Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import { MergedResourceRequest } from './index'
import { ranges2List, $atom, $ref } from '../utils/falcor'
import { PathValue } from 'falcor-router'
import { resourceFieldValuePath, resourceFieldLengthPath, resourceLabelPath } from '../utils/juno';


export default (request: MergedResourceRequest): Observable<PathValue> => from(Object.keys(request)).pipe(
  mergeMap((type) => {
    return from(request[type].resources).pipe(
      mergeMap((resource) => {
        const pathValues: PathValue[] = []

        if (request[type].label) {
          pathValues.push({
            path: resourceLabelPath('juno', type, resource),
            value: `${type} ${resource}`,
          })
        }

        request[type].fields.forEach((field) => {
          if (request[type].count) {
            pathValues.push({
              path: resourceFieldLengthPath('juno', type, resource, field),
              value: field === 'shareholderOf' ? 5 : 1,
            })
          }

          pathValues.push(...(field === 'birthDate' ?
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
          ))
        })

        return from(pathValues)
      })
    )
  }),
)
