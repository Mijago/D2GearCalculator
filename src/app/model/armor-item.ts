import {Stats} from "./stats";
import {ArmorClass, ArmorSlot} from "./armor-slot";


export interface ArmorItem {
  name: string,
  id: string,
  clazz: ArmorClass,
  isExotic: boolean;
  slot: ArmorSlot;
  stats: Stats;
}
