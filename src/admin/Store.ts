import {
  createStore,
  applyMiddleware,
  Store,
  combineReducers,
  Action
} from "redux";
import {
  useSelector as useReduxSelector,
  TypedUseSelectorHook
} from "react-redux";
import promise, { ActionType } from "redux-promise-middleware";
import { createReducer } from "redux-promise-middleware-actions";
import { CreateHandlerMap } from "redux-promise-middleware-actions/lib/reducers";
import { composeWithDevTools } from "redux-devtools-extension";
import lodash from "lodash";
import {
  createKioskWindow,
  updateKioskWindow,
  captureWindowScreenshot,
  deleteKioskWindow,
  readKioskConfig,
  updateKioskConfig,
  readDisplays,
  updateAutoLogin,
  deleteAutoLogin,
  readAutoLaunch,
  readAutoLogin,
  updateAutoLaunch
} from "./Actions";
import { KioskState, initialState } from "./KioskState";

export const useSelector: TypedUseSelectorHook<KioskState> = useReduxSelector;

const pendingReducer = (state: number = 0, action: Action<string>) => {
  if (action.type.startsWith("CAPTURE_WINDOW_SCREENSHOT")) return state;
  if (action.type.endsWith(ActionType.Pending)) return state + 1;
  if (action.type.endsWith(ActionType.Fulfilled)) return state - 1;
  if (action.type.endsWith(ActionType.Rejected)) return state - 1;
  return state;
};

const configReducer = createReducer(
  initialState.kioskConfig,
  (reduce: CreateHandlerMap<KioskState["kioskConfig"]>) => [
    reduce(createKioskWindow.fulfilled, (kioskConfig, { payload: window }) => ({
      ...kioskConfig,
      windows: [...kioskConfig.windows, window]
    })),
    reduce(
      updateKioskWindow.fulfilled,
      (kioskConfig, { payload: updatedWindow }) => ({
        ...kioskConfig,
        windows: kioskConfig.windows.map(w =>
          w.id === updatedWindow.id ? updatedWindow : w
        )
      })
    ),
    reduce(
      deleteKioskWindow.fulfilled,
      (kioskConfig, { payload: deletedWindow }) => ({
        ...kioskConfig,
        windows: kioskConfig.windows.filter(w => w.id !== deletedWindow.id)
      })
    ),
    reduce(
      readKioskConfig.fulfilled,
      (_, { payload: kioskConfig }) => kioskConfig
    ),
    reduce(
      updateKioskConfig.fulfilled,
      (kioskConfig, { payload: updatedKioskConfig }) => ({
        ...kioskConfig,
        ...lodash.pickBy(updatedKioskConfig, (v: any) => v !== undefined)
      })
    )
  ]
);

const screenshotReducer = createReducer(
  initialState.screenshots,
  (reduce: CreateHandlerMap<KioskState["screenshots"]>) => [
    reduce(
      captureWindowScreenshot.fulfilled,
      (currentState, { payload: [screenshot, window] }) => ({
        ...currentState,
        data: {
          ...currentState.data,
          [window.id]: screenshot
        }
      })
    ),
    reduce(
      captureWindowScreenshot.rejected,
      (currentState, { payload: error }) => ({
        ...currentState,
        errors: [...currentState.errors, error]
      })
    )
  ]
);

const displayReducer = createReducer(
  initialState.displays,
  (reduce: CreateHandlerMap<KioskState["displays"]>) => [
    reduce(readDisplays.fulfilled, (_, { payload: displays }) => displays)
  ]
);

const autoLaunchReducer = createReducer(
  initialState.autoLaunch,
  (reduce: CreateHandlerMap<KioskState["autoLaunch"]>) => [
    reduce(
      readAutoLaunch.fulfilled,
      (_, { payload: autoLaunch }) => autoLaunch
    ),
    reduce(updateAutoLaunch.fulfilled, (_, { payload: toggle }) => toggle)
  ]
);

const autoLoginReducer = createReducer(
  initialState.autoLogin,
  (reduce: CreateHandlerMap<KioskState["autoLogin"]>) => [
    reduce(readAutoLogin.fulfilled, (_, { payload: autoLogin }) => autoLogin),
    reduce(updateAutoLogin.fulfilled, (_, { payload: autoLogin }) => autoLogin),
    reduce(deleteAutoLogin.fulfilled, currentState => ({
      ...currentState,
      valid: undefined
    }))
  ]
);

const errorCatcher = () => {
  return (next: any) => (action: any) => {
    // If not a promise, continue on.
    if (!action.payload || typeof action.payload.then !== "function") {
      return next(action);
    }

    // Dispatch initial pending promise, but catch any errors.
    return next(action).catch((error: Error) => {
      if (Object.getPrototypeOf(error).constructor.name === "Warning") {
        console.warn(error);
      } else {
        console.error(error);
      }

      return error;
    });
  };
};

export const store: Store = createStore(
  combineReducers({
    pendingRequests: pendingReducer,
    kioskConfig: configReducer,
    screenshots: screenshotReducer,
    displays: displayReducer,
    autoLaunch: autoLaunchReducer,
    autoLogin: autoLoginReducer
  }),
  initialState,
  composeWithDevTools(applyMiddleware(errorCatcher, promise))
);
