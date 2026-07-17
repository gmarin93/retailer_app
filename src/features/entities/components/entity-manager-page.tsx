"use client";

import { ENTITY_CONFIGS, type EntityKey } from "../configs";
import { EntityManager } from "./entity-manager";

/**
 * Client-side config resolution: server route pages pass only the entity key
 * (configs contain cell-render functions, which cannot cross the RSC boundary).
 */
export function EntityManagerPage({ entityKey }: { entityKey: EntityKey }) {
  return <EntityManager config={ENTITY_CONFIGS[entityKey]} />;
}
