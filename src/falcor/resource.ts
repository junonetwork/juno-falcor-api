import { from, Observable } from 'rxjs'
import { mergeMap, delay, map, filter } from 'rxjs/operators'
import { pipe, reduce, uniq, lensProp, concat, over, set, defaultTo } from 'ramda'
import { PathValue, StandardRange } from 'falcor-router'
import { ranges2List, $atom, $ref } from '../utils/falcor'
import { resourceFieldValuePath, resourceFieldLengthPath, resourceLabelPath } from '../utils/juno'


export type ResourceValueRequest = { type: 'resource', resourceTypes: string[], resources: string[], fields: string[], ranges: StandardRange[] }
export type ResourceCountRequest = { type: 'resource-count', resourceTypes: string[], resources: string[], fields: string[] }
export type ResourceLabelRequest = { type: 'resource-label', resourceTypes: string[], resources: string[] }
export type ResourceRequest = ResourceValueRequest | ResourceCountRequest | ResourceLabelRequest
export type ResourceRequestByType = { resources: string[], fields: string[], ranges: StandardRange[], count: boolean, label: boolean }
export type MergedResourceRequest = { [resourceType: string]: ResourceRequestByType }


export const mergeResourceRequests = reduce<ResourceRequest, MergedResourceRequest>(
  (grouped, req) => {
    return req.resourceTypes.reduce((grouped, resourceType) => {
      return over(lensProp(resourceType), (requestsByType: ResourceRequestByType | undefined) => {
        return pipe(
          defaultTo({
            resources: [],
            fields: [],
            ranges: [],
            count: false,
            label: false,
          }),
          over(lensProp('resources'), (resources) => uniq(concat(req.resources, resources))),
          over(lensProp('fields'), (fields) => req.type !== 'resource-label' ? uniq(concat(req.fields, fields)) : fields),
          (requestsByType) => {
            if (req.type === 'resource') {
              return over(lensProp('ranges'), (ranges) => uniq(concat(req.ranges, ranges)), requestsByType) // TODO - merge ranges, rather than simply concatenating
            } else if (req.type === 'resource-count') {
              return set(lensProp('count'), true, requestsByType)
            } else if (req.type === 'resource-label') {
              return set(lensProp('label'), true, requestsByType)
            }

            return requestsByType as never
          },
        )(requestsByType)
      }, grouped)
    }, grouped)
  },
  {}
)


export default (request: MergedResourceRequest): Observable<PathValue | PathValue[]> => from(Object.keys(request)).pipe(
  mergeMap((type) => {
    return from(request[type].resources).pipe(
      filter((resource) => resource !== 'nonexistant'),
      map((resource) => {
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

        return pathValues
      }),
    )
  }),
  delay(100)
)
