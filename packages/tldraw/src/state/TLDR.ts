import { TLBounds, TLTransformInfo, Utils, TLPageState } from '@tldraw/core'
import {
  TLDrawSnapshot,
  ShapeStyles,
  ShapesWithProp,
  TLDrawShape,
  TLDrawBinding,
  TLDrawPage,
  TLDrawCommand,
  TLDrawPatch,
  TLDrawShapeType,
  ArrowShape,
} from '~types'
import { Vec } from '@tldraw/vec'
import type { TLDrawShapeUtil } from './shapes/TLDrawShapeUtil'
import { getShapeUtils } from './shapes'

export class TLDR {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getShapeUtils<T extends TLDrawShape>(type: T['type']): TLDrawShapeUtil<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getShapeUtils<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T>
  static getShapeUtils<T extends TLDrawShape>(shape: T | T['type']) {
    return getShapeUtils<T>(shape)
  }

  static getSelectedShapes(data: TLDrawSnapshot, pageId: string) {
    const page = TLDR.getPage(data, pageId)
    const selectedIds = TLDR.getSelectedIds(data, pageId)
    return selectedIds.map((id) => page.shapes[id])
  }

  static screenToWorld(data: TLDrawSnapshot, point: number[]) {
    const camera = TLDR.getPageState(data, data.appState.currentPageId).camera
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  static getCameraZoom(zoom: number) {
    return Utils.clamp(zoom, 0.1, 5)
  }

  static getPage(data: TLDrawSnapshot, pageId: string): TLDrawPage {
    return data.document.pages[pageId]
  }

  static getPageState(data: TLDrawSnapshot, pageId: string): TLPageState {
    return data.document.pageStates[pageId]
  }

  static getSelectedIds(data: TLDrawSnapshot, pageId: string): string[] {
    return TLDR.getPageState(data, pageId).selectedIds
  }

  static getShapes(data: TLDrawSnapshot, pageId: string): TLDrawShape[] {
    return Object.values(TLDR.getPage(data, pageId).shapes)
  }

  static getCamera(data: TLDrawSnapshot, pageId: string): TLPageState['camera'] {
    return TLDR.getPageState(data, pageId).camera
  }

  static getShape<T extends TLDrawShape = TLDrawShape>(
    data: TLDrawSnapshot,
    shapeId: string,
    pageId: string
  ): T {
    return TLDR.getPage(data, pageId).shapes[shapeId] as T
  }

  static getCenter<T extends TLDrawShape>(shape: T) {
    return TLDR.getShapeUtils(shape).getCenter(shape)
  }

  static getBounds<T extends TLDrawShape>(shape: T) {
    return TLDR.getShapeUtils(shape).getBounds(shape)
  }

  static getRotatedBounds<T extends TLDrawShape>(shape: T) {
    return TLDR.getShapeUtils(shape).getRotatedBounds(shape)
  }

  static getSelectedBounds(data: TLDrawSnapshot): TLBounds {
    return Utils.getCommonBounds(
      TLDR.getSelectedShapes(data, data.appState.currentPageId).map((shape) =>
        TLDR.getShapeUtils(shape).getBounds(shape)
      )
    )
  }

  static getParentId(data: TLDrawSnapshot, id: string, pageId: string) {
    return TLDR.getShape(data, id, pageId).parentId
  }

  // static getPointedId(data: TLDrawSnapshot, id: string, pageId: string): string {
  //   const page = TLDR.getPage(data, pageId)
  //   const pageState = TLDR.getPageState(data, data.appState.currentPageId)
  //   const shape = TLDR.getShape(data, id, pageId)
  //   if (!shape) return id

  //   return shape.parentId === pageState.currentParentId || shape.parentId === page.id
  //     ? id
  //     : TLDR.getPointedId(data, shape.parentId, pageId)
  // }

  // static getDrilledPointedId(data: TLDrawSnapshot, id: string, pageId: string): string {
  //   const shape = TLDR.getShape(data, id, pageId)
  //   const { currentPageId } = data.appState
  //   const { currentParentId, pointedId } = TLDR.getPageState(data, data.appState.currentPageId)

  //   return shape.parentId === currentPageId ||
  //     shape.parentId === pointedId ||
  //     shape.parentId === currentParentId
  //     ? id
  //     : TLDR.getDrilledPointedId(data, shape.parentId, pageId)
  // }

  // static getTopParentId(data: TLDrawSnapshot, id: string, pageId: string): string {
  //   const page = TLDR.getPage(data, pageId)
  //   const pageState = TLDR.getPageState(data, pageId)
  //   const shape = TLDR.getShape(data, id, pageId)

  //   if (shape.parentId === shape.id) {
  //     throw Error(`Shape has the same id as its parent! ${shape.id}`)
  //   }

  //   return shape.parentId === page.id || shape.parentId === pageState.currentParentId
  //     ? id
  //     : TLDR.getTopParentId(data, shape.parentId, pageId)
  // }

  // Get an array of a shape id and its descendant shapes' ids
  static getDocumentBranch(data: TLDrawSnapshot, id: string, pageId: string): string[] {
    const shape = TLDR.getShape(data, id, pageId)

    if (shape.children === undefined) return [id]

    return [
      id,
      ...shape.children.flatMap((childId) => TLDR.getDocumentBranch(data, childId, pageId)),
    ]
  }

  // Get a deep array of unproxied shapes and their descendants
  static getSelectedBranchSnapshot<K>(
    data: TLDrawSnapshot,
    pageId: string,
    fn: (shape: TLDrawShape) => K
  ): ({ id: string } & K)[]
  static getSelectedBranchSnapshot(data: TLDrawSnapshot, pageId: string): TLDrawShape[]
  static getSelectedBranchSnapshot<K>(
    data: TLDrawSnapshot,
    pageId: string,
    fn?: (shape: TLDrawShape) => K
  ): (TLDrawShape | K)[] {
    const page = TLDR.getPage(data, pageId)

    const copies = TLDR.getSelectedIds(data, pageId)
      .flatMap((id) => TLDR.getDocumentBranch(data, id, pageId).map((id) => page.shapes[id]))
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // Get a shallow array of unproxied shapes
  static getSelectedShapeSnapshot(data: TLDrawSnapshot, pageId: string): TLDrawShape[]
  static getSelectedShapeSnapshot<K>(
    data: TLDrawSnapshot,
    pageId: string,
    fn?: (shape: TLDrawShape) => K
  ): ({ id: string } & K)[]
  static getSelectedShapeSnapshot<K>(
    data: TLDrawSnapshot,
    pageId: string,
    fn?: (shape: TLDrawShape) => K
  ): (TLDrawShape | K)[] {
    const copies = TLDR.getSelectedShapes(data, pageId)
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // For a given array of shape ids, an array of all other shapes that may be affected by a mutation to it.
  // Use this to decide which shapes to clone as before / after for a command.
  static getAllEffectedShapeIds(data: TLDrawSnapshot, ids: string[], pageId: string): string[] {
    const page = TLDR.getPage(data, pageId)

    const visited = new Set(ids)

    ids.forEach((id) => {
      const shape = page.shapes[id]

      // Add descendant shapes
      function collectDescendants(shape: TLDrawShape): void {
        if (shape.children === undefined) return
        shape.children
          .filter((childId) => !visited.has(childId))
          .forEach((childId) => {
            visited.add(childId)
            collectDescendants(page.shapes[childId])
          })
      }

      collectDescendants(shape)

      // Add asecendant shapes
      function collectAscendants(shape: TLDrawShape): void {
        const parentId = shape.parentId
        if (parentId === page.id) return
        if (visited.has(parentId)) return
        visited.add(parentId)
        collectAscendants(page.shapes[parentId])
      }

      collectAscendants(shape)

      // Add bindings that are to or from any of the visited shapes (this does not have to be recursive)
      visited.forEach((id) => {
        Object.values(page.bindings)
          .filter((binding) => binding.fromId === id || binding.toId === id)
          .forEach((binding) => visited.add(binding.fromId === id ? binding.toId : binding.fromId))
      })
    })

    // Return the unique array of visited shapes
    return Array.from(visited.values())
  }

  static updateBindings(
    data: TLDrawSnapshot,
    id: string,
    beforeShapes: Record<string, Partial<TLDrawShape>> = {},
    afterShapes: Record<string, Partial<TLDrawShape>> = {},
    pageId: string
  ): TLDrawSnapshot {
    const page = { ...TLDR.getPage(data, pageId) }
    return Object.values(page.bindings)
      .filter((binding) => binding.fromId === id || binding.toId === id)
      .reduce((cTLDrawSnapshot, binding) => {
        if (!beforeShapes[binding.fromId]) {
          beforeShapes[binding.fromId] = Utils.deepClone(
            TLDR.getShape(cTLDrawSnapshot, binding.fromId, pageId)
          )
        }

        if (!beforeShapes[binding.toId]) {
          beforeShapes[binding.toId] = Utils.deepClone(
            TLDR.getShape(cTLDrawSnapshot, binding.toId, pageId)
          )
        }

        TLDR.onBindingChange(
          TLDR.getShape(cTLDrawSnapshot, binding.fromId, pageId),
          binding,
          TLDR.getShape(cTLDrawSnapshot, binding.toId, pageId)
        )

        afterShapes[binding.fromId] = Utils.deepClone(
          TLDR.getShape(cTLDrawSnapshot, binding.fromId, pageId)
        )
        afterShapes[binding.toId] = Utils.deepClone(
          TLDR.getShape(cTLDrawSnapshot, binding.toId, pageId)
        )

        return cTLDrawSnapshot
      }, data)
  }

  static getLinkedShapes(
    data: TLDrawSnapshot,
    pageId: string,
    direction: 'center' | 'left' | 'right',
    includeArrows = true
  ) {
    const selectedIds = TLDR.getSelectedIds(data, pageId)

    const page = TLDR.getPage(data, pageId)

    const linkedIds = new Set<string>(selectedIds)

    const checkedIds = new Set<string>()

    const idsToCheck = [...selectedIds]

    const arrows = new Set(
      Object.values(page.shapes).filter((shape) => {
        return (
          shape.type === TLDrawShapeType.Arrow &&
          (shape.handles.start.bindingId || shape.handles?.end.bindingId)
        )
      }) as ArrowShape[]
    )

    while (idsToCheck.length) {
      const id = idsToCheck.pop()

      if (!(id && arrows.size)) break

      if (checkedIds.has(id)) continue

      checkedIds.add(id)

      arrows.forEach((arrow) => {
        const {
          handles: {
            start: { bindingId: startBindingId },
            end: { bindingId: endBindingId },
          },
        } = arrow

        const startBinding = startBindingId ? page.bindings[startBindingId] : null
        const endBinding = endBindingId ? page.bindings[endBindingId] : null

        let hit = false

        if (startBinding && startBinding.toId === id) {
          if (direction === 'center') {
            hit = true
          } else if (arrow.decorations?.start && endBinding) {
            // The arrow is pointing to this shape at its start
            hit = direction === 'left'
          } else {
            // The arrow is pointing away from this shape
            hit = direction === 'right'
          }

          if (hit) {
            // This arrow is bound to this shape
            if (includeArrows) linkedIds.add(arrow.id)
            linkedIds.add(id)

            if (endBinding) {
              linkedIds.add(endBinding.toId)
              idsToCheck.push(endBinding.toId)
            }
          }
        } else if (endBinding && endBinding.toId === id) {
          // This arrow is bound to this shape at its end
          if (direction === 'center') {
            hit = true
          } else if (arrow.decorations?.end && startBinding) {
            // The arrow is pointing to this shape
            hit = direction === 'left'
          } else {
            // The arrow is pointing away from this shape
            hit = direction === 'right'
          }

          if (hit) {
            if (includeArrows) linkedIds.add(arrow.id)
            linkedIds.add(id)

            if (startBinding) {
              linkedIds.add(startBinding.toId)
              idsToCheck.push(startBinding.toId)
            }
          }
        }

        if (
          (!startBinding || linkedIds.has(startBinding.toId)) &&
          (!endBinding || linkedIds.has(endBinding.toId))
        ) {
          arrows.delete(arrow)
        }
      })
    }

    return Array.from(linkedIds.values())
  }

  static getChildIndexAbove(data: TLDrawSnapshot, id: string, pageId: string): number {
    const page = data.document.pages[pageId]
    const shape = page.shapes[id]

    let siblings: TLDrawShape[]

    if (shape.parentId === page.id) {
      siblings = Object.values(page.shapes)
        .filter((shape) => shape.parentId === page.id)
        .sort((a, b) => a.childIndex - b.childIndex)
    } else {
      const parent = page.shapes[shape.parentId]
      if (!parent.children) throw Error('No children in parent!')
      siblings = parent.children
        .map((childId) => page.shapes[childId])
        .sort((a, b) => a.childIndex - b.childIndex)
    }

    const index = siblings.indexOf(shape)

    const nextSibling = siblings[index + 1]

    if (!nextSibling) return shape.childIndex + 1

    return nextSibling.childIndex
  }

  /* -------------------------------------------------- */
  /*                      Mutations                     */
  /* -------------------------------------------------- */

  static getBeforeShape<T extends TLDrawShape>(shape: T, change: Partial<T>): Partial<T> {
    return Object.fromEntries(
      Object.keys(change).map((k) => [k, shape[k as keyof T]])
    ) as Partial<T>
  }

  static mutateShapes<T extends TLDrawShape>(
    data: TLDrawSnapshot,
    ids: string[],
    fn: (shape: T, i: number) => Partial<T> | void,
    pageId: string
  ): {
    before: Record<string, Partial<T>>
    after: Record<string, Partial<T>>
    data: TLDrawSnapshot
  } {
    const beforeShapes: Record<string, Partial<T>> = {}
    const afterShapes: Record<string, Partial<T>> = {}

    ids.forEach((id, i) => {
      const shape = TLDR.getShape<T>(data, id, pageId)
      const change = fn(shape, i)
      if (change) {
        beforeShapes[id] = TLDR.getBeforeShape(shape, change)
        afterShapes[id] = change
      }
    })

    const dataWithMutations = Utils.deepMerge(data, {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: afterShapes,
          },
        },
      },
    })
    const dataWithBindingChanges = ids.reduce<TLDrawSnapshot>((cTLDrawSnapshot, id) => {
      return TLDR.updateBindings(cTLDrawSnapshot, id, beforeShapes, afterShapes, pageId)
    }, dataWithMutations)

    return {
      before: beforeShapes,
      after: afterShapes,
      data: dataWithBindingChanges,
    }
  }

  static createShapes(data: TLDrawSnapshot, shapes: TLDrawShape[], pageId: string): TLDrawCommand {
    const before: TLDrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              ...Object.fromEntries(
                shapes.flatMap((shape) => {
                  const results: [string, Partial<TLDrawShape> | undefined][] = [
                    [shape.id, undefined],
                  ]

                  // If the shape is a child of another shape, also save that shape
                  if (shape.parentId !== pageId) {
                    const parent = TLDR.getShape(data, shape.parentId, pageId)
                    if (!parent.children) throw Error('No children in parent!')
                    results.push([parent.id, { children: parent.children }])
                  }

                  return results
                })
              ),
            },
          },
        },
      },
    }

    const after: TLDrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              shapes: {
                ...Object.fromEntries(
                  shapes.flatMap((shape) => {
                    const results: [string, Partial<TLDrawShape> | undefined][] = [
                      [shape.id, shape],
                    ]

                    // If the shape is a child of a different shape, update its parent
                    if (shape.parentId !== pageId) {
                      const parent = TLDR.getShape(data, shape.parentId, pageId)
                      if (!parent.children) throw Error('No children in parent!')
                      results.push([parent.id, { children: [...parent.children, shape.id] }])
                    }

                    return results
                  })
                ),
              },
            },
          },
        },
      },
    }

    return {
      before,
      after,
    }
  }

  static deleteShapes(
    data: TLDrawSnapshot,
    shapes: TLDrawShape[] | string[],
    pageId?: string
  ): TLDrawCommand {
    pageId = pageId ? pageId : data.appState.currentPageId

    const page = TLDR.getPage(data, pageId)

    const shapeIds =
      typeof shapes[0] === 'string'
        ? (shapes as string[])
        : (shapes as TLDrawShape[]).map((shape) => shape.id)

    const before: TLDrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              // These are the shapes that we're going to delete
              ...Object.fromEntries(
                shapeIds.flatMap((id) => {
                  const shape = page.shapes[id]
                  const results: [string, Partial<TLDrawShape> | undefined][] = [[shape.id, shape]]

                  // If the shape is a child of another shape, also add that shape
                  if (shape.parentId !== pageId) {
                    const parent = page.shapes[shape.parentId]
                    if (!parent.children) throw Error('No children in parent!')
                    results.push([parent.id, { children: parent.children }])
                  }

                  return results
                })
              ),
            },
            bindings: {
              // These are the bindings that we're going to delete
              ...Object.fromEntries(
                Object.values(page.bindings)
                  .filter((binding) => {
                    return shapeIds.includes(binding.fromId) || shapeIds.includes(binding.toId)
                  })
                  .map((binding) => {
                    return [binding.id, binding]
                  })
              ),
            },
          },
        },
      },
    }

    const after: TLDrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              ...Object.fromEntries(
                shapeIds.flatMap((id) => {
                  const shape = page.shapes[id]
                  const results: [string, Partial<TLDrawShape> | undefined][] = [
                    [shape.id, undefined],
                  ]

                  // If the shape is a child of a different shape, update its parent
                  if (shape.parentId !== page.id) {
                    const parent = page.shapes[shape.parentId]

                    if (!parent.children) throw Error('No children in parent!')

                    results.push([
                      parent.id,
                      { children: parent.children.filter((id) => id !== shape.id) },
                    ])
                  }

                  return results
                })
              ),
            },
          },
        },
      },
    }

    return {
      before,
      after,
    }
  }

  static onSessionComplete<T extends TLDrawShape>(shape: T) {
    const delta = TLDR.getShapeUtils(shape).onSessionComplete?.(shape)
    if (!delta) return shape
    return { ...shape, ...delta }
  }

  static onChildrenChange<T extends TLDrawShape>(data: TLDrawSnapshot, shape: T, pageId: string) {
    if (!shape.children) return

    const delta = TLDR.getShapeUtils(shape).onChildrenChange?.(
      shape,
      shape.children.map((id) => TLDR.getShape(data, id, pageId))
    )

    if (!delta) return shape

    return { ...shape, ...delta }
  }

  static onBindingChange<T extends TLDrawShape>(
    shape: T,
    binding: TLDrawBinding,
    otherShape: TLDrawShape
  ) {
    const delta = TLDR.getShapeUtils(shape).onBindingChange?.(
      shape,
      binding,
      otherShape,
      TLDR.getShapeUtils(otherShape).getBounds(otherShape),
      TLDR.getShapeUtils(otherShape).getCenter(otherShape)
    )
    if (!delta) return shape

    return { ...shape, ...delta }
  }

  static transform<T extends TLDrawShape>(shape: T, bounds: TLBounds, info: TLTransformInfo<T>) {
    const delta = TLDR.getShapeUtils(shape).transform(shape, bounds, info)
    if (!delta) return shape
    return { ...shape, ...delta }
  }

  static transformSingle<T extends TLDrawShape>(
    shape: T,
    bounds: TLBounds,
    info: TLTransformInfo<T>
  ) {
    const delta = TLDR.getShapeUtils(shape).transformSingle(shape, bounds, info)
    if (!delta) return shape
    return { ...shape, ...delta }
  }

  /**
   * Rotate a shape around an origin point.
   * @param shape a shape.
   * @param center the shape's center in page space.
   * @param origin the page point to rotate around.
   * @param rotation the amount to rotate the shape.
   */
  static getRotatedShapeMutation<T extends TLDrawShape>(
    shape: T, // in page space
    center: number[], // in page space
    origin: number[], // in page space (probably the center of common bounds)
    delta: number // The shape's rotation delta
  ): Partial<T> | void {
    // The shape's center relative to the shape's point
    const relativeCenter = Vec.sub(center, shape.point)

    // Rotate the center around the origin
    const rotatedCenter = Vec.rotWith(center, origin, delta)

    // Get the top left point relative to the rotated center
    const nextPoint = Vec.round(Vec.sub(rotatedCenter, relativeCenter))

    // If the shape has handles, we need to rotate the handles instead
    // of rotating the shape. Shapes with handles should never be rotated,
    // because that makes a lot of other things incredible difficult.
    if (shape.handles !== undefined) {
      const change = this.getShapeUtils(shape).onHandleChange?.(
        // Base the change on a shape with the next point
        { ...shape, point: nextPoint },
        Object.fromEntries(
          Object.entries(shape.handles).map(([handleId, handle]) => {
            // Rotate each handle's point around the shape's center
            // (in relative shape space, as the handle's point will be).
            const point = Vec.round(Vec.rotWith(handle.point, relativeCenter, delta))
            return [handleId, { ...handle, point }]
          })
        ) as T['handles'],
        { shiftKey: false }
      )

      return change
    }

    // If the shape has no handles, move the shape to the new point
    // and set the rotation.

    // Clamp the next rotation between 0 and PI2
    const nextRotation = Utils.clampRadians((shape.rotation || 0) + delta)

    return {
      point: nextPoint,
      rotation: nextRotation,
    } as Partial<T>
  }

  /* -------------------------------------------------- */
  /*                       Parents                      */
  /* -------------------------------------------------- */

  static updateParents(data: TLDrawSnapshot, pageId: string, changedShapeIds: string[]): void {
    const page = TLDR.getPage(data, pageId)

    if (changedShapeIds.length === 0) return

    const { shapes } = TLDR.getPage(data, pageId)

    const parentToUpdateIds = Array.from(
      new Set(changedShapeIds.map((id) => shapes[id].parentId).values())
    ).filter((id) => id !== page.id)

    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId]

      if (!parent.children) {
        throw Error('A shape is parented to a shape without a children array.')
      }

      TLDR.onChildrenChange(data, parent, pageId)
    }

    TLDR.updateParents(data, pageId, parentToUpdateIds)
  }

  static getSelectedStyle(data: TLDrawSnapshot, pageId: string): ShapeStyles | false {
    const { currentStyle } = data.appState

    const page = data.document.pages[pageId]
    const pageState = data.document.pageStates[pageId]

    if (pageState.selectedIds.length === 0) {
      return currentStyle
    }

    const shapeStyles = pageState.selectedIds.map((id) => page.shapes[id].style)

    const commonStyle = {} as ShapeStyles

    const overrides = new Set<string>([])

    for (const shapeStyle of shapeStyles) {
      const styles = Object.keys(currentStyle) as (keyof ShapeStyles)[]
      styles.forEach((key) => {
        if (overrides.has(key)) return
        if (commonStyle[key] === undefined) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          commonStyle[key] = shapeStyle[key]
        } else {
          if (commonStyle[key] === shapeStyle[key]) return
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          commonStyle[key] = currentStyle[key]
          overrides.add(key)
        }
      })
    }

    return commonStyle
  }

  /* -------------------------------------------------- */
  /*                      Bindings                      */
  /* -------------------------------------------------- */

  static getBinding(data: TLDrawSnapshot, id: string, pageId: string): TLDrawBinding {
    return TLDR.getPage(data, pageId).bindings[id]
  }

  static getBindings(data: TLDrawSnapshot, pageId: string): TLDrawBinding[] {
    const page = TLDR.getPage(data, pageId)
    return Object.values(page.bindings)
  }

  static getBindableShapeIds(data: TLDrawSnapshot) {
    return TLDR.getShapes(data, data.appState.currentPageId)
      .filter((shape) => TLDR.getShapeUtils(shape).canBind)
      .sort((a, b) => b.childIndex - a.childIndex)
      .map((shape) => shape.id)
  }

  static getBindingsWithShapeIds(
    data: TLDrawSnapshot,
    ids: string[],
    pageId: string
  ): TLDrawBinding[] {
    return Array.from(
      new Set(
        TLDR.getBindings(data, pageId).filter((binding) => {
          return ids.includes(binding.toId) || ids.includes(binding.fromId)
        })
      ).values()
    )
  }

  static getRelatedBindings(data: TLDrawSnapshot, ids: string[], pageId: string): TLDrawBinding[] {
    const changedShapeIds = new Set(ids)

    const page = TLDR.getPage(data, pageId)

    // Find all bindings that we need to update
    const bindingsArr = Object.values(page.bindings)

    // Start with bindings that are directly bound to our changed shapes
    const bindingsToUpdate = new Set(
      bindingsArr.filter(
        (binding) => changedShapeIds.has(binding.toId) || changedShapeIds.has(binding.fromId)
      )
    )

    // Next, look for other bindings that effect the same shapes
    let prevSize = bindingsToUpdate.size
    let delta = -1

    while (delta !== 0) {
      bindingsToUpdate.forEach((binding) => {
        const fromId = binding.fromId

        for (const otherBinding of bindingsArr) {
          if (otherBinding.fromId === fromId) {
            bindingsToUpdate.add(otherBinding)
          }

          if (otherBinding.toId === fromId) {
            bindingsToUpdate.add(otherBinding)
          }
        }
      })

      // Continue until we stop finding new bindings to update
      delta = bindingsToUpdate.size - prevSize

      prevSize = bindingsToUpdate.size
    }

    return Array.from(bindingsToUpdate.values())
  }

  static copyStringToClipboard = (string: string) => {
    try {
      navigator.clipboard.writeText(string)
    } catch (e) {
      const textarea = document.createElement('textarea')
      textarea.setAttribute('position', 'fixed')
      textarea.setAttribute('top', '0')
      textarea.setAttribute('readonly', 'true')
      textarea.setAttribute('contenteditable', 'true')
      textarea.style.position = 'fixed'
      textarea.value = string
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()

      try {
        const range = document.createRange()
        range.selectNodeContents(textarea)
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
          textarea.setSelectionRange(0, textarea.value.length)
        }
      } catch (err) {
        null // Could not copy to clipboard
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  /* -------------------------------------------------- */
  /*                       Groups                       */
  /* -------------------------------------------------- */

  static flattenShape = (data: TLDrawSnapshot, shape: TLDrawShape): TLDrawShape[] => {
    return [
      shape,
      ...(shape.children ?? [])
        .map((childId) => TLDR.getShape(data, childId, data.appState.currentPageId))
        .sort((a, b) => a.childIndex - b.childIndex)
        .flatMap((shape) => TLDR.flattenShape(data, shape)),
    ]
  }

  static flattenPage = (data: TLDrawSnapshot, pageId: string): TLDrawShape[] => {
    return Object.values(data.document.pages[pageId].shapes)
      .sort((a, b) => a.childIndex - b.childIndex)
      .reduce<TLDrawShape[]>((acc, shape) => [...acc, ...TLDR.flattenShape(data, shape)], [])
  }

  static getTopChildIndex = (data: TLDrawSnapshot, pageId: string): number => {
    const shapes = TLDR.getShapes(data, pageId)
    return shapes.length === 0
      ? 1
      : shapes
          .filter((shape) => shape.parentId === pageId)
          .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
  }

  /* -------------------------------------------------- */
  /*                     Assertions                     */
  /* -------------------------------------------------- */

  static assertShapeHasProperty<P extends keyof TLDrawShape>(
    shape: TLDrawShape,
    prop: P
  ): asserts shape is ShapesWithProp<P> {
    if (shape[prop] === undefined) {
      throw new Error()
    }
  }
}