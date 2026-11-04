import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/tsunagi/element/define";

@Component({
  selector: "app-level",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<tsunagi-board grid="6" level="12"></tsunagi-board>`,
})
export class LevelComponent {}
