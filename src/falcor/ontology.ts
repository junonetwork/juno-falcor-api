import { PathValue, Atom, Ref } from 'falcor-router'
import { of, Observable, from } from 'rxjs'
import { $ref, $atom } from '../utils/falcor'
import { map, mergeMap } from 'rxjs/operators'


const TYPES_LIST = ['company', 'person']
const TYPES: {
  [id: string]: {
    label: string[],
    field: string[]
  }
} = {
  company: {
    label: ['Company'],
    field: ['name', 'shareholderOf', 'hasShareholder'],
  },
  person: {
    label: ['Person'],
    field: ['name', 'birthDate', 'shareholderOf', 'nationality'],
  },
  country: {
    label: ['Country'],
    field: ['name'],
  }
}
const FIELDS: {
  [id: string]: {
    label: (string | { label: string, language: string })[],
    range: (Atom | Ref)[]
  }
} = {
  name: {
    label: ['name', { label: 'nombre', language: 'es' }],
    range: [$atom('string')],
  },
  shareholderOf: {
    label: ['Shareholder Of'],
    range: [$ref(['juno', 'resource', 'type', 'company'])],
  },
  hasShareholder: {
    label: ['Has Shareholder'],
    range: [$ref(['juno', 'resource', 'type', 'company']), $ref(['juno', 'resource', 'type', 'person'])],
  },
  birthDate: {
    label: ['Birth Date'],
    range: [$atom('date')],
  },
  nationality: {
    label: ['Nationality'],
    range: [$ref(['juno', 'resource', 'type', 'country'])],
  }
}

export const graphTypeList = (indicesOrLength: (string | number)[]): Observable<PathValue> => from(indicesOrLength).pipe(
  map((idxOrLength) => {
    if (idxOrLength === 'length') {
      return {
        path: ['juno', 'types', 'length'],
        value: TYPES_LIST.length
      }
    } else if (TYPES_LIST[idxOrLength] !== undefined) {
      return {
        path: ['juno', 'types', idxOrLength],
        value: $ref(['juno', 'resource', 'type', TYPES_LIST[idxOrLength]])
      }
    }

    return {
      path: ['juno', 'types', idxOrLength],
      value: null
    }
  })
)

export const graphTypeValue = (ids: string[], fields: ('label' | 'field')[], indicesOrLength: (string | number)[]): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (TYPES[id] === undefined) {
      return of({
        path: ['juno', 'resource', 'type', id],
        value: null,
      })
    }

    return from(fields).pipe(
      mergeMap((field) => from(indicesOrLength).pipe(
        map((indexOrLength) => {
          if (field === 'label') {
            if (indexOrLength === 'length') {
              return {
                path: ['juno', 'resource', 'type', id, 'label', 'length'],
                value: TYPES[id].label.length
              }
            } else if (TYPES[id].label[indexOrLength] !== undefined) {
              return {
                path: ['juno', 'resource', 'type', id, 'label', indexOrLength],
                value: TYPES[id].label[indexOrLength]
              }
            }
            return {
              path: ['juno', 'resource', 'type', id, 'label', indexOrLength],
              value: null
            }
          } else if (field === 'field') {
            if (indexOrLength === 'length') {
              return {
                path: ['juno', 'resource', 'type', id, 'field', 'length'],
                value: TYPES[id].field.length
              }
            } else if (TYPES[id].field[indexOrLength] !== undefined) {
              return {
                path: ['juno', 'resource', 'type', id, 'field', indexOrLength],
                value: $ref(['juno', 'resource', 'field', TYPES[id].field[indexOrLength]])
              }
            }
            return {
              path: ['juno', 'resource', 'type', id, 'field', indexOrLength],
              value: null
            }
          }

          return {
            path: ['juno', 'resource', 'type', id, field],
            value: null
          }
        })
      ))
    )
  })
)

export const graphFieldValue = (ids: string[], fields: ('label' | 'range')[], indicesOrLength: (string | number)[]): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (FIELDS[id] === undefined) {
      return of({
        path: ['juno', 'resource', 'field', id],
        value: null,
      })
    }

    return from(fields).pipe(
      mergeMap((field) => from(indicesOrLength).pipe(
        map((indexOrLength) => {
          if (field === 'label') {
            if (indexOrLength === 'length') {
              return {
                path: ['juno', 'resource', 'field', id, 'label', 'length'],
                value: FIELDS[id].label.length
              }
            } else if (FIELDS[id].label[indexOrLength] !== undefined) {
              return typeof FIELDS[id].label[indexOrLength] === 'string' ?
                {
                  path: ['juno', 'resource', 'field', id, 'label', indexOrLength],
                  value: FIELDS[id].label[indexOrLength]
                } : {
                  path: ['juno', 'resource', 'field', id, 'label', indexOrLength],
                  value: $atom(FIELDS[id].label[indexOrLength].label, { language: FIELDS[id].label[indexOrLength].language })
                }
            }

            return {
              path: ['juno', 'resource', 'field', id, 'label', indexOrLength],
              value: null
            }
          } else if (field === 'range') {
            if (indexOrLength === 'length') {
              return {
                path: ['juno', 'resource', 'field', id, 'range', 'length'],
                value: FIELDS[id].range.length
              }
            } else if (FIELDS[id].range[indexOrLength] !== undefined) {
              return {
                path: ['juno', 'resource', 'field', id, 'range', indexOrLength],
                value: FIELDS[id].range[indexOrLength]
              }
            }

            return {
              path: ['juno', 'resource', 'field', id, 'range', indexOrLength],
              value: null
            }
          }

          return {
            path: ['juno', 'resource', 'field', id, field],
            value: null
          }
        })
      ))
    )
  })
)
