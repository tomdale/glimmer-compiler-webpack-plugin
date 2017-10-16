import { SpecifierMap } from "@glimmer/bundle-compiler";
import { dict, expect } from '@glimmer/util';
import { DataSegment } from "./bundle";
import { Project } from 'glimmer-analyzer';

export default class ExternalModuleTable {
  project: Project;
  projectPath: string;

  constructor(private map: SpecifierMap, protected dataSegment: DataSegment) {
  }

  buildSpecifierTable() {
    let table = dict<number>();

    this.map.byHandle.forEach((specifier, handle) => {
      let muSpecifier = expect(this.project.specifierForPath(specifier.module), `couldn't find specifier for module ${specifier.module}`);
      table[muSpecifier] = handle;
    });

    return JSON.stringify(table);
  }
}