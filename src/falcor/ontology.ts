import { PathValue, Atom, Ref } from 'falcor-router'
import { of, Observable, from } from 'rxjs'
import { $ref, $atom } from '../utils/falcor'
import { map, mergeMap } from 'rxjs/operators'
import { resourceFieldLengthPath, resourceFieldValuePath, resourceFieldPath, resourcePath } from '../utils/juno';


const TYPES_LIST = ['company', 'person']
const TYPES: {
  [id: string]: {
    label: (string | Atom)[],
    field: Ref[],
  }
} = {
  company: {
    label: ['Company'],
    field: [$ref(['juno', 'resource', 'field', 'name']), $ref(['juno', 'resource', 'field', 'shareholderOf']), $ref(['juno', 'resource', 'field', 'hasShareholder'])],
  },
  person: {
    label: ['Person'],
    field: [$ref(['juno', 'resource', 'field', 'name']), $ref(['juno', 'resource', 'field', 'birthDate']), $ref(['juno', 'resource', 'field', 'shareholderOf']), $ref(['juno', 'resource', 'field', 'nationality'])],
  },
  country: {
    label: ['Country'],
    field: [$ref(['juno', 'resource', 'field', 'name'])],
  }
}
const FIELDS: {
  [id: string]: {
    label: (string | Atom)[],
    range: (string | Atom | Ref)[],
  }
} = {
  name: {
    label: ['Name', $atom('Nombre', { language: 'es'})],
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

export const graphTypeValue = (ids: string[], fields: string[], indices: number[]): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (TYPES[id] === undefined) {
      return of({
        path: resourcePath('juno', 'type', id),
        value: null,
      })
    }

    return from(fields).pipe(
      mergeMap((field) => from(indices).pipe(
        map((index) => {
          if (TYPES[id][field] === undefined) {
            return {
              path: resourceFieldPath('juno', 'type', id, field),
              value: null
            }
          } else if (TYPES[id][field][index] === undefined) {
            return {
              path: resourceFieldValuePath('juno', 'type', id, field, index),
              value: null
            }
          }

          return {
            path: resourceFieldValuePath('juno', 'type', id, field, index),
            value: TYPES[id][field][index],
          }
        })
      ))
    )
  })
)

export const graphTypeValueLength = (ids: string[], fields: string[]): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (TYPES[id] === undefined) {
      return of({
        path: resourcePath('juno', 'type', id),
        value: null,
      })
    }

    return from(fields).pipe(
      map((field) => {
        if (TYPES[id][field] === undefined) {
          return {
            path: resourceFieldLengthPath('juno', 'type', id, field),
            value: null
          }
        }

        return {
          path: resourceFieldLengthPath('juno', 'type', id, field),
          value: TYPES[id][field].length
        }
      })
    )
  })
)

export const graphFieldValue = (ids: string[], fields: ('label' | 'range')[], indices: number[]): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (FIELDS[id] === undefined) {
      return of({
        path: resourcePath('juno', 'field', id),
        value: null,
      })
    }

    return from(fields).pipe(
      mergeMap((field) => from(indices).pipe(
        map((index) => {
          if (FIELDS[id][field] === undefined) {
            return {
              path: resourceFieldPath('juno', 'field', id, field),
              value: null
            }
          } else if (FIELDS[id][field][index] === undefined) {
            return {
              path: resourceFieldValuePath('juno', 'field', id, field, index),
              value: null
            }
          }

          return {
            path: resourceFieldValuePath('juno', 'field', id, 'label', index),
            value: FIELDS[id][field][index]
          }
        })
      ))
    )
  })
)

export const graphFieldValueLength = (ids: string[], fields: string[]): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (FIELDS[id] === undefined) {
      return of({
        path: resourcePath('juno', 'field', id),
        value: null,
      })
    }

    return from(fields).pipe(
      map((field) => {
        if (FIELDS[id][field] === undefined) {
          return {
            path: resourceFieldLengthPath('juno', 'field', id, field),
            value: null
          }
        }

        return {
          path: resourceFieldLengthPath('juno', 'field', id, field),
          value: FIELDS[id][field].length
        }
      })
    )
  })
)
