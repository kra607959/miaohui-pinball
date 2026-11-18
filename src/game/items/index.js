import { charms } from './charms.js';
import { balls,spells,mods } from './gear.js';
export { charms,balls,spells,mods };
export const catalog = [...charms,...balls,...spells,...mods];
export const byId = Object.fromEntries(catalog.map(item=>[item.id,item]));
