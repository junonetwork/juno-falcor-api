import { xprod as ramda_xprod } from "ramda";

export const xprod = <A, B, C>(ax: A[], bx: B[], cx: C[]) => ramda_xprod(ax, bx)
  .reduce<Array<[A, B, C]>>((acc, abProd: [A, B]) => {
    const abcProd = cx.map((c) => [...abProd, c] as [A, B, C])
    acc.push(...abcProd)
    return acc
  }, [])

/**
 * [graph, "search", search]
 * 
 * ["juno", "search", "type=person"]
 */
export const searchPath = (graph: string, search: string) => [graph, 'search', search]
/**
 * [graph, "search", search, index]
 * 
 * ["juno", "search", "type=person", 0]
 */
export const searchResultPath = (graph: string, search: string, index: number) => [graph, 'search', search, index]
/**
 * [graph, "search", search, "length"]
 * 
 * ["juno", "search", "type=person", "length"]
 */
export const searchLengthPath = (graph: string, search: string) => [graph, 'search', search, 'length']

/**
 * [graph, "resource", resource]
 * 
 * ["juno", "resource", "_1"]
 */
export const resourcePath = (graph: string, resource: string) => [graph, 'resource', resource]
/**
 * [graph, "resource", resource, type, resource, field, index]
 * 
 * ["juno", "resource", "person", "_1", "name", 0]
 */
export const resourceFieldValuePath = (graph: string, type: string, resource: string, field: string, index: number) => [graph, 'resource', type, resource, field, index]
/**
 * [graph, "resource", resource, type, resource, field]
 * 
 * ["juno", "resource", "person", "_1", "name", "length"]
 */
export const resourceFieldLengthPath = (graph: string, type: string, resource: string, field: string) => [graph, 'resource', type, resource, field, 'length']
