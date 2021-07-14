import {Component, OnInit} from '@angular/core';
import {DestinyArmorCsvParserService} from "./services/destiny-armor-csv-parser.service";
import {HttpClient} from "@angular/common/http";
import {DestinyArmorPermutationService, Permutation} from "./services/destiny-armor-permutation.service";
import {ArmorClass, ArmorSlot} from "./model/armor-slot";
import {Subject} from "rxjs";
import {debounceTime} from "rxjs/operators";
import {FormControl, FormGroupDirective, NgForm, Validators} from "@angular/forms";
import {ErrorStateMatcher} from "@angular/material/core";
import {animate, state, style, transition, trigger} from "@angular/animations";

interface PrintedPermutation {
  permutation: Permutation;
  score: number
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),],
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'D2GearCalculator';


  updateTableSubject: Subject<any> = new Subject();
  updatePermutationsSubject: Subject<any> = new Subject();
  shownColumns = ["mobility", "resilience", "recovery", "discipline", "intellect", "strength"]

  permutations: Permutation[] = []
  printedTable: PrintedPermutation[] = []
  expandedElement: PrintedPermutation | null = null;

  selectedClass = ArmorClass.Titan;
  weightMobility: number | null = 1;
  weightResilience: number | null = 1;
  weightRecovery: number | null = 1;
  weightDiscipline: number | null = 1;
  weightIntellect: number | null = 1;
  weightStrength: number | null = 1;


  getTable(): PrintedPermutation[] {
    console.log(this.weightMobility, this.weightResilience, this.weightRecovery, this.weightDiscipline, this.weightIntellect, this.weightStrength)
    let newList = this.permutations.map(d => {
      let p: PrintedPermutation = {
        permutation: d,
        score: 0
      }
      if (d.gauntlet && d.legs && d.chest) {
        let mobility = d.stats.mobility
        let resilience = d.stats.resilience
        let recovery = d.stats.recovery
        let discipline = d.stats.discipline
        let intellect = d.stats.intellect
        let strength = d.stats.strength

        p.score = (
          +(this.weightMobility || 0) * mobility
          + (this.weightResilience || 0) * resilience
          + (this.weightRecovery || 0) * recovery
          + (this.weightDiscipline || 0) * discipline
          + (this.weightIntellect || 0) * intellect
          + (this.weightStrength || 0) * strength
          // stats from 1-4 and 6-9 are wasted
          - 4 * (mobility % 5 > 0 ? 1 : 0)
          - 4 * (resilience % 5 > 0 ? 1 : 0)
          - 4 * (recovery % 5 > 0 ? 1 : 0)
          - 4 * (discipline % 5 > 0 ? 1 : 0)
          - 4 * (intellect % 5 > 0 ? 1 : 0)
          - 4 * (strength % 5 > 0 ? 1 : 0)
          // stats over 100 are wasted
          - 1.2 * (Math.max(0, mobility - 100))
          - 1.2 * (Math.max(0, resilience - 100))
          - 1.2 * (Math.max(0, recovery - 100))
          - 1.2 * (Math.max(0, discipline - 100))
          - 1.2 * (Math.max(0, intellect - 100))
          - 1.2 * (Math.max(0, strength - 100))
        )
        p.score = Math.ceil(p.score)
      }
      return p
    })
    return newList.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 40)
  }

  constructor(private csv: DestinyArmorCsvParserService, private httpClient: HttpClient,
              private perm: DestinyArmorPermutationService) {
  }

  ngOnInit(): void {
    this.updateTableSubject
      .pipe(debounceTime(50))
      .subscribe(() => {
          this.printedTable = this.getTable()
          console.log("this.printedTable", this.printedTable)
        }
      );

    this.updatePermutationsSubject
      .pipe(debounceTime(50))
      .subscribe(() => {
          this.updatePermutations()
        }
      );

    this.updatePermutations()
  }

  updatePermutations() {
    if (this.files.length > 0) {
      this.csv.parse(this.files[0])
        .subscribe(
          d => {
            d = d.filter(c => c.clazz == this.selectedClass)
            let titanPermutations = this.perm.buildPermutations(d)
            this.permutations = titanPermutations;
            console.log(titanPermutations)
            this.updateTableSubject.next()
          }
        )
    }
  }


  // in app.component.ts
  files: File[] = [];

  onSelect(event: any) {
    this.files = []
    this.files.push(...event.addedFiles);
    this.updatePermutationsSubject.next()
  }

  onRemove(event: any) {
    console.log(event);
    this.files.splice(this.files.indexOf(event), 1);
  }

  onWeightChange(): void {
    console.log("ONCHANGE WEIGHT")
    this.updateTableSubject.next();
  }

  onClassChange(): void {
    console.log("ONCHANGE CLASS")
    this.updatePermutationsSubject.next()
  }

  addExampleFile() {
    this.httpClient.get('assets/destinyArmor.csv', {responseType: 'text'})
      .subscribe(data => {
        this.files = [new File([data], "Mijago's destinyArmor.csv")]
        this.updatePermutations()
      })
  }


}
