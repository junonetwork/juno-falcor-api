import { Sentinel } from "falcor-router";

export type Literal = string | number | boolean | undefined | Array<any> | { [key: string]: any }

export type Search = {
  type: string
}

export type ResourceId = { $type: 'id', value: string }

export type Count = number | { $type: 'count', value: number, qualifier: 'eq' | 'lt' | 'gt' | 'approximate' }

export type SearchResponse = { searchKey: string, index: number, id: string | undefined }

export type SearchCountResponse = { searchKey: string, count: Count }

export type ResourceResponse = { resource: string, field: string, index: number, value: Literal | ResourceId }

export type ResourceCountResponse = { resource: string, field: string, count: Count }

export type ApiResponse = SearchResponse | SearchCountResponse | ResourceResponse | ResourceCountResponse
