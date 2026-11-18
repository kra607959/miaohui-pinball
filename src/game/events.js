export function createHooks(items, ctx) {
  const handlers=new Map();
  for(const item of items) {
    const state=item.init?.()??{};
    for(const [type,fn] of Object.entries(item.on??{})) {
      if(!handlers.has(type))handlers.set(type,[]);
      handlers.get(type).push(event=>fn(ctx,event,state));
    }
  }
  return (type,event) => {
    for(const handler of handlers.get(type)??[])handler(event);
    return event;
  };
}
