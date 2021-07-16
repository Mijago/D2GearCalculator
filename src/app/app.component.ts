import {Component, OnInit} from '@angular/core';
import {DestinyArmorCsvParserService} from "./services/destiny-armor-csv-parser.service";
import {HttpClient} from "@angular/common/http";
import {DestinyArmorPermutationService, Permutation} from "./services/destiny-armor-permutation.service";
import {ArmorClass, ArmorSlot} from "./model/armor-slot";
import {Subject} from "rxjs";
import {debounceTime} from "rxjs/operators";
import {FormBuilder, FormControl, FormGroup, FormGroupDirective, NgForm, Validators} from "@angular/forms";
import {ErrorStateMatcher} from "@angular/material/core";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {Stats} from "./model/stats";

interface PrintedPermutation {
  permutation: Permutation;
  mods: Stats[];
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

  options: FormGroup;
  advanceModeActive: boolean = false;

  minMobilityControl = new FormControl(18, [Validators.min(18), Validators.max(100)]);
  minResilienceControl = new FormControl(18, [Validators.min(18), Validators.max(100)]);
  minRecoveryControl = new FormControl(18, [Validators.min(18), Validators.max(100)]);
  minDisciplineControl = new FormControl(18, [Validators.min(18), Validators.max(100)]);
  minIntellectControl = new FormControl(18, [Validators.min(18), Validators.max(100)]);
  minStrengthControl = new FormControl(18, [Validators.min(18), Validators.max(100)]);

  maxMobilityControl = new FormControl("", [Validators.min(18)]);
  maxResilienceControl = new FormControl("", [Validators.min(18)]);
  maxRecoveryControl = new FormControl("", [Validators.min(18)]);
  maxDisciplineControl = new FormControl("", [Validators.min(18)]);
  maxIntellectControl = new FormControl("", [Validators.min(18)]);
  maxStrengthControl = new FormControl("", [Validators.min(18)]);

  staticMobilityControl = new FormControl("", [Validators.min(0)]);
  staticResilienceControl = new FormControl("", [Validators.min(0)]);
  staticRecoveryControl = new FormControl("", [Validators.min(0)]);
  staticDisciplineControl = new FormControl("", [Validators.min(0)]);
  staticIntellectControl = new FormControl("", [Validators.min(0)]);
  staticStrengthControl = new FormControl("", [Validators.min(0)]);

  helmetTextFilterControl = new FormControl("");
  gauntletTextFilterControl = new FormControl("");
  chestTextFilterControl = new FormControl("");
  legsTextFilterControl = new FormControl("");

  updateTableSubject: Subject<any> = new Subject();
  updatePermutationsSubject: Subject<any> = new Subject();
  shownColumns = ["mobility", "resilience", "recovery", "discipline", "intellect", "strength", "tiers"]

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


  constructor(fb: FormBuilder,
              private csv: DestinyArmorCsvParserService, private httpClient: HttpClient,
              private perm: DestinyArmorPermutationService) {
    this.options = fb.group({
      minMobility: this.minMobilityControl,
      minResilience: this.minResilienceControl,
      minRecovery: this.minRecoveryControl,
      minDiscipline: this.minDisciplineControl,
      minIntellect: this.minIntellectControl,
      minStrength: this.minStrengthControl,

      maxMobility: this.maxMobilityControl,
      maxResilience: this.maxResilienceControl,
      maxRecovery: this.maxRecoveryControl,
      maxDiscipline: this.maxDisciplineControl,
      maxIntellect: this.maxIntellectControl,
      maxStrength: this.maxStrengthControl,


    });
  }

  toggleAdvanceMode() {
    this.advanceModeActive = !this.advanceModeActive
    console.log("this.advanceModeActive", this.advanceModeActive)
  }

  getTable(): PrintedPermutation[] {
    console.log(this.weightMobility, this.weightResilience, this.weightRecovery, this.weightDiscipline, this.weightIntellect, this.weightStrength)
    console.log(this.helmetTextFilterControl.value, this.gauntletTextFilterControl.value, this.chestTextFilterControl.value, this.legsTextFilterControl.value)
    console.log(this.permutations.length, this.permutations)
    // Filter stats

    let newPermutations = this.permutations.map(p => {
      let newPerm = Object.assign({}, p)
      let nstats = Object.assign({}, p.stats)
      newPerm.stats = nstats

      nstats.mobility += 1 * (this.staticMobilityControl.value || 0);
      nstats.resilience += 1 * (this.staticResilienceControl.value || 0);
      nstats.recovery += 1 * (this.staticRecoveryControl.value || 0);
      nstats.discipline += 1 * (this.staticDisciplineControl.value || 0);
      nstats.intellect += 1 * (this.staticIntellectControl.value || 0);
      nstats.strength += 1 * (this.staticStrengthControl.value || 0);

      return newPerm;
    })

    let filteredPermutations = newPermutations.filter(p => {
      if (!p.gauntlet || !p.chest || !p.legs) {
        console.warn(p)
        return false;
      }

      // filter name(s)
      if ((this.helmetTextFilterControl.value && p.helmet.name.toLowerCase().indexOf(this.helmetTextFilterControl.value.toLowerCase()) < 0)
        || (this.gauntletTextFilterControl.value && p.gauntlet.name.toLowerCase().indexOf(this.gauntletTextFilterControl.value.toLowerCase()) < 0)
        || (this.chestTextFilterControl.value && p.chest.name.toLowerCase().indexOf(this.chestTextFilterControl.value.toLowerCase()) < 0)
        || (this.legsTextFilterControl.value && p.legs.name.toLowerCase().indexOf(this.legsTextFilterControl.value.toLowerCase()) < 0))
        return false;

      // filter stats
      if (p.stats.mobility < this.minMobilityControl.value || (!!this.maxMobilityControl.value && p.stats.mobility > this.maxMobilityControl.value)
        || p.stats.resilience < this.minResilienceControl.value || (!!this.maxResilienceControl.value && p.stats.resilience > this.maxResilienceControl.value)
        || p.stats.recovery < this.minRecoveryControl.value || (!!this.maxRecoveryControl.value && p.stats.recovery > this.maxRecoveryControl.value)
        || p.stats.discipline < this.minDisciplineControl.value || (!!this.maxDisciplineControl.value && p.stats.discipline > this.maxDisciplineControl.value)
        || p.stats.intellect < this.minIntellectControl.value || (!!this.maxIntellectControl.value && p.stats.intellect > this.maxIntellectControl.value)
        || p.stats.strength < this.minStrengthControl.value || (!!this.maxStrengthControl.value && p.stats.strength > this.maxStrengthControl.value))
        return false;

      return true;
    })
    let newList = filteredPermutations.map(data => {
      let p: PrintedPermutation = {
        permutation: data,
        mods: [],
        score: 0
      }
      p.score = this.getScore(data);
      return p
    })
    return newList.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 40)
  }

  getScore(data: Permutation): number {
    let score = 0;
    if (data.gauntlet && data.legs && data.chest) {
      let mobility = data.stats.mobility
      let resilience = data.stats.resilience
      let recovery = data.stats.recovery
      let discipline = data.stats.discipline
      let intellect = data.stats.intellect
      let strength = data.stats.strength

      score = (
        +Math.min(100, this.weightMobility || 0) * mobility
        + Math.min(100, this.weightResilience || 0) * resilience
        + Math.min(100, this.weightRecovery || 0) * recovery
        + Math.min(100, this.weightDiscipline || 0) * discipline
        + Math.min(100, this.weightIntellect || 0) * intellect
        + Math.min(100, this.weightStrength || 0) * strength
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
      score = Math.ceil(score)
    }
    return score
  }

  ngOnInit(): void {
    this.updateTableSubject
      .pipe(debounceTime(300))
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
            this.permutations = this.perm.buildPermutations(d);
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

  onTextFilterChange(): void {
    console.log("ONCHANGE TEXTFILTER")
    this.updateTableSubject.next()
  }

  onLimitsChange(): void {
    console.log("ONCHANGE LIMITS")
    this.updateTableSubject.next()
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

  getSkillTierFromPermutation(stat: Stats) {
    return Math.floor(stat.mobility / 10)
      + Math.floor(stat.resilience / 10)
      + Math.floor(stat.recovery / 10)
      + Math.floor(stat.discipline / 10)
      + Math.floor(stat.intellect / 10)
      + Math.floor(stat.strength / 10)
  }

  addMod(permutation: PrintedPermutation, name: string, value: number) {
    let mod: Stats = {recovery: 0, discipline: 0, resilience: 0, intellect: 0, strength: 0, mobility: 0,}
    switch (name) {
      case "mobility":
        mod.mobility = value;
        break;
      case "recovery":
        mod.recovery = value;
        break;
      case "discipline":
        mod.discipline = value;
        break;
      case "resilience":
        mod.resilience = value;
        break;
      case "intellect":
        mod.intellect = value;
        break;
      case "strength":
        mod.strength = value;
        break;
    }
    permutation.mods.push(mod);
  }

  removeMod(permutation: PrintedPermutation, mod: Stats) {
    console.log("permutation.mods", permutation.mods, permutation.mods.indexOf(mod))
    permutation.mods.splice(
      permutation.mods.indexOf(mod), 1
    )
  }

  getStatSum(stats: Stats[]) {
    return stats.reduce((a, b) => {
        a.mobility += b.mobility;
        a.resilience += b.resilience;
        a.recovery += b.recovery;
        a.discipline += b.discipline;
        a.intellect += b.intellect;
        a.strength += b.strength;
        return a;
      }, {recovery: 0, discipline: 0, resilience: 0, intellect: 0, strength: 0, mobility: 0},
    )
  }

  usesStaticStatBoosts() {
    return (this.staticResilienceControl.value + this.staticResilienceControl.value + this.staticRecoveryControl.value
      + this.staticDisciplineControl.value + this.staticIntellectControl.value + this.staticStrengthControl.value) > 0
  }
}
