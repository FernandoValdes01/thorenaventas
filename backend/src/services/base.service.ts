export function listStub(resource: string) {
  return { resource, items: [], source: 'stub' };
}

export function detailStub(resource: string, id: string) {
  return { resource, id, source: 'stub' };
}
