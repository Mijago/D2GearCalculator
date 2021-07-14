import {Injectable} from '@angular/core';
import {NgxCsvParser, NgxCSVParserError} from "ngx-csv-parser";
import {ArmorItem} from "../model/armor-item";
import {ArmorClass, ArmorSlot} from "../model/armor-slot";
import {Observable, Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class DestinyArmorCsvParserService {

  constructor(private parser: NgxCsvParser) {
  }

  public parse(csvFile: File): Observable<ArmorItem[]> {
    var subject = new Subject<ArmorItem[]>();
    // Parse the file you want to select for the operation along with the configuration
    this.parser.parse(csvFile, {header: true, delimiter: ','})
      .pipe()
      .subscribe((result) => {
        result = (result as any[])
          .map((e) => {
            let slot: ArmorSlot = ArmorSlot.ArmorSlotHelmet;
            switch (e["Type"]) {
              case "Helmet":
                slot = ArmorSlot.ArmorSlotHelmet;
                break;
              case "Gauntlets":
                slot = ArmorSlot.ArmorSlotGauntlet;
                break;
              case "Chest Armor":
                slot = ArmorSlot.ArmorSlotChest;
                break;
              case "Leg Armor":
                slot = ArmorSlot.ArmorSlotLegs;
                break;
              case "Hunter Cloak":
              case "Titan Mark":
              case "Warlock Bond":
                slot = ArmorSlot.ArmorSlotClass;
                break;
              default:
                throw new Error("Unknown armor type " + e["Type"])
            }

            let clazz = undefined;

            switch (e["Equippable"]) {
              case "Titan":
                clazz = ArmorClass.Titan;
                break;
              case "Warlock":
                clazz = ArmorClass.Warlock;
                break;
              case "Hunter":
                clazz = ArmorClass.Hunter;
                break;
              default:
                throw new Error("Unknown armor class " + e["Equippable"])
            }

            return <ArmorItem>{
              name: e["Name"],
              id: e["Id"].replace('"', "").replace('"', ""),
              isExotic: e["Tier"] == "Exotic",
              slot: slot,
              clazz: clazz,
              stats: {
                mobility: 1 * e["Mobility (Base)"],
                resilience: 1 * e["Resilience (Base)"],
                recovery: 1 * e["Recovery (Base)"],
                discipline: 1 * e["Discipline (Base)"],
                intellect: 1 * e["Intellect (Base)"],
                strength: 1 * e["Strength (Base)"],
              }
            }
          })
        subject.next(result);
        console.log('Result', result);
      }, (error: NgxCSVParserError) => {
        console.log('Error', error);
      });
    return subject.asObservable();
  }
}
