import { Dispatch } from "redux";

export const tryOrElse = <T>(
  f: () => T | undefined,
  fallback?: T | ((error: Error) => T | undefined)
): T | undefined => {
  try {
    return f();
  } catch (error) {
    if (fallback instanceof Function) {
      return fallback(error);
    } else {
      return fallback;
    }
  }
};

export const tryDispatch = <T>(
  action: T,
  dispatch: Dispatch<any>,
  otherwise: (error: Error) => void = console.warn
) => {
  const awaiter = async () => {
    try {
      await dispatch(action);
    } catch (e) {
      otherwise(e);
    }
  };

  awaiter();
};
