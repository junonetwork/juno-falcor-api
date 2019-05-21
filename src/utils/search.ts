import { parse } from 'query-string'
import { Search } from '../types'


// TODO - use more robust validation library, like io-ts
export const parseSearch = (searchString: string): (Search | undefined) => {
  const parsed: Partial<Search> = parse(searchString)

  return !searchIsValid(parsed) ? undefined : parsed
}

export const searchIsValid = (search: Partial<Search>): search is Search => typeof search.type === 'string'
