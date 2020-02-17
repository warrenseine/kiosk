import qs from "qs";

export interface KioskParams {
  host: string;
  port: string;
  mode: string;
}

const defaultKioskParams: KioskParams = {
  host: "localhost",
  port: "8080",
  mode: "admin"
};

const parseQueryString = (queryString: string): KioskParams => {
  const args = qs.parse(queryString, { ignoreQueryPrefix: true });

  if (!args.host || !args.port || !args.mode) {
    return defaultKioskParams;
  }

  return args;
};

export const kioskParams = parseQueryString(window.location.search);
