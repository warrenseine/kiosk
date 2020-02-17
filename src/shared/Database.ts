import lodash from "lodash";
import low, { AdapterSync, LowdbSync } from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import LocalStorage from "lowdb/adapters/LocalStorage";
import { KioskConfig, KioskConfigDefault } from "./KioskConfig";
import { ReadonlyDeep, PartialDeep } from "type-fest";
import { KioskWindow } from "./KioskWindow";

export enum StorageBackend {
  File,
  LocalStorage
}

export const buildDatabase = (
  backend: StorageBackend,
  path?: string
): Database => {
  switch (backend) {
    case StorageBackend.File:
      return new Database(new FileSync<KioskConfig>(path || "kiosk.json"));
    case StorageBackend.LocalStorage:
      return new Database(new LocalStorage("kiosk"));
  }
};

export class Database {
  private db: LowdbSync<KioskConfig>;

  constructor(adapter: AdapterSync<KioskConfig>) {
    this.db = low(adapter);

    this.db.defaults(KioskConfigDefault).write();
  }

  addWindow(window: ReadonlyDeep<KioskWindow>): void {
    this.db
      .get("windows")
      .push(lodash.cloneDeep(window) as KioskWindow)
      .write();
  }

  removeWindow(window: ReadonlyDeep<KioskWindow>): void {
    this.db
      .get("windows")
      .remove(w => w.id === window.id)
      .write();
  }

  updateWindow(window: ReadonlyDeep<KioskWindow>): void {
    this.db
      .get("windows")
      .find(w => w.id === window.id)
      .assign(window)
      .write();
  }

  getWindows(): ReadonlyDeep<KioskWindow[]> {
    return this.db.get("windows").value();
  }

  getConfig(): Readonly<KioskConfig> {
    return this.db.cloneDeep().value();
  }

  getPort(): number {
    return this.db.get("port").value();
  }

  setConfig(config: PartialDeep<KioskConfig>) {
    this.db.merge(config).write();
  }
}
