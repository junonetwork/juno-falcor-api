export type Literal = string | number | boolean | undefined | Array<any> | { [key: string]: any }

export type Search = {
  type: string
}

export type Count = number | { $type: 'count', value: number, qualifier: 'eq' | 'lt' | 'gt' | 'approximate' }

export type Label = string | { label: string, language: string } | Array<{ label: string, language: string }>
