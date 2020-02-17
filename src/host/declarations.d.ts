declare module "auto-launch" {
  export default function autoLaunch({
    name
  }: {
    name: string;
  }): {
    enable(): Promise<boolean>;
    disable(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
  };
}

declare module "regedit" {
  export interface RegistryValue {
    value: any;
    type:
      | "REG_SZ"
      | "REG_EXPAND_SZ"
      | "REG_DWORD"
      | "REG_QWORD"
      | "REG_MULTI_SZ"
      | "REG_BINARY"
      | "REG_DEFAULT";
  }

  export interface RegistryValues {
    [key: string]: {
      keys: string[];
      values: { [name: string]: RegistryValue };
    };
  }

  export interface RegistryKeys {
    [name: string]: { [name: string]: RegistryValue };
  }

  export function putValue(
    keys: RegistryKeys,
    callback: (error: any) => void
  ): void;

  export function list(
    key: String,
    callback: (error: any, values: RegistryValues) => void
  ): void;

  export function setExternalVBSLocation(vbsDirectory: string): void;
}

declare module "electron-squirrel-startup" {}
