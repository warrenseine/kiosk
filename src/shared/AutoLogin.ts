import { Toggle } from "./Toggle";

export interface WindowsCredentials {
  userName: string;
  password: string;
}

export type AutoLoginRequest = Toggle & {
  credentials?: WindowsCredentials;
};

export type AutoLoginStatus = Toggle & {
  valid?: boolean;
};
