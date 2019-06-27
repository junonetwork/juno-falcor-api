import { PathValue, Atom, Ref } from 'falcor-router'
import { Observable, of } from 'rxjs'
import { $ref, $atom } from '../utils/falcor'


export const TYPES_LIST = ['company', 'person']
export const TYPES: {
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
export const FIELDS: {
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


export const graphTypeList = (indicesOrLength: (string | number)[]): Observable<PathValue[]> => of(indicesOrLength.map((idxOrLength) => {
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
}))
