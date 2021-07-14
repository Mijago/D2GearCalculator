import {Injectable} from '@angular/core';
import {ArmorItem} from "../model/armor-item";
import {ArmorSlot} from "../model/armor-slot";
import {Stats} from "../model/stats";

export interface Permutation {
  hasExotic: boolean,
  helmet: ArmorItem,
  gauntlet?: ArmorItem,
  chest?: ArmorItem,
  legs?: ArmorItem,
  stats: Stats
}


@Injectable({
  providedIn: 'root'
})
export class DestinyArmorPermutationService {

  constructor() {
  }

  public buildPermutations(armor: ArmorItem[]): Permutation[] {
    let permutations: Permutation[] = []

    let helmets = armor.filter(s => s.slot == ArmorSlot.ArmorSlotHelmet);
    let gauntlets = armor.filter(s => s.slot == ArmorSlot.ArmorSlotGauntlet);
    let chests = armor.filter(s => s.slot == ArmorSlot.ArmorSlotChest);
    let legs = armor.filter(s => s.slot == ArmorSlot.ArmorSlotLegs);


    for (let helmet of helmets) {
      let permu0: Permutation = {
        hasExotic: helmet.isExotic,
        helmet: helmet,
        gauntlet: undefined,
        chest: undefined,
        legs: undefined,
        stats: {
          mobility: 10,
          resilience: 10,
          recovery: 10,
          discipline: 10,
          intellect: 10,
          strength: 10,
        }
      }
      this.addStats(permu0.stats, helmet.stats)

      //#####################################
      for (let gauntlet of gauntlets) {
        // Skip if we aready have an exotic in this build
        if (permu0.hasExotic && gauntlet.isExotic)
          continue;

        let permu1 = Object.assign({}, permu0) as Permutation
        permu1.stats = Object.assign({}, permu0.stats)
        permu1.gauntlet = gauntlet;
        this.addStats(permu1.stats, gauntlet.stats)
        if (gauntlet.isExotic) {
          permu1.hasExotic = true;
        }
        //#####################################
        for (let chest of chests) {
          // Skip if we aready have an exotic in this build
          if (permu1.hasExotic && chest.isExotic)
            continue;

          let permu2 = Object.assign({}, permu1) as Permutation
          permu2.stats = Object.assign({}, permu1.stats)
          permu2.chest = chest;
          this.addStats(permu2.stats, chest.stats)
          if (chest.isExotic) {
            permu2.hasExotic = true;
          }
          //#####################################
          for (let leg of legs) {
            // Skip if we aready have an exotic in this build
            if (permu2.hasExotic && leg.isExotic)
              continue;

            let permu3 = Object.assign({}, permu2) as Permutation
            permu3.stats = Object.assign({}, permu2.stats)
            permu3.legs = leg;
            this.addStats(permu3.stats, leg.stats)
            if (leg.isExotic) {
              permu3.hasExotic = true;
            }
            permutations.push(permu3)
          }
        }
      }
    }
    return permutations;
  }

  addStats(target: Stats, source: Stats) {
    target.mobility += 1 * source.mobility;
    target.resilience += 1 * source.resilience;
    target.recovery += 1 * source.recovery;
    target.discipline += 1 * source.discipline;
    target.intellect += 1 * source.intellect;
    target.strength += 1 * source.strength;
  }
}
