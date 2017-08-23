import { dict, Option } from '@glimmer/util';

export type ModuleName = string;
export type NamedExport = string;

export interface Specifier {
  module: NamedExport;
  name: ModuleName;
}

export interface Scope {
  [identifier: string]: string;
}

class ComponentModule {
  private name: string;
  private scope: Scope;

  constructor(name: string, scope: Scope) {
    this.name = name;
    this.scope = scope;
  }
}

export default class ComponentRegistry {
  private registry = dict<ComponentModule>();

  has(name: string): boolean {
    return name in this.registry;
  }

  get(name: string): ComponentModule {
    return this.registry[name];
  }

  register(name: string, scope: Scope) {
    this.registry[name] = new ComponentModule(name, scope);
  }

  resolve(name: string, referer: Specifier): Option<string> {
    let local = referer.module && referer.module.replace(/^((.*)\/)?([^\/]*)$/, `$1${name}`);
    if (local && this.registry[local]) {
      return local;
    } else if (this.registry[name]) {
      return name;
    } else {
      return null;
    }
  }
}
