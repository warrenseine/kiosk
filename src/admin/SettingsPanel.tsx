import React, { FC, useEffect, useCallback, useRef } from "react";
import {
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  TextField,
  Divider,
  Grid,
  Theme,
  Paper,
  Tooltip
} from "@material-ui/core";
import { makeStyles, createStyles } from "@material-ui/styles";
import Editor from "@monaco-editor/react";
import { DeepPartial } from "redux";
import { useDispatch } from "react-redux";
import { useDebouncedCallback } from "use-debounce";
import { useSelector } from "./Store";
import {
  readKioskConfig,
  updateKioskConfig,
  readAutoLogin,
  readAutoLaunch,
  updateAutoLogin,
  updateAutoLaunch,
  deleteAutoLogin
} from "./Actions";
import { KioskConfig } from "../shared/KioskConfig";

interface Editor {
  onDidChangeModelContent: (callback: () => void) => void;
  getValue: () => string;
  setValue: (value: string) => void;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    form: {
      width: "100%"
    },
    textField: {
      marginRight: theme.spacing(2)
    },
    inlineTextField: {
      marginRight: theme.spacing(2),
      marginTop: 0
    },
    divider: {
      margin: theme.spacing(2, 0)
    },
    row: {
      height: 54
    }
  })
);

const operatingSystem = "Windows";

export const SettingsPanel: FC = () => {
  const classes = useStyles();
  const userNameRef = useRef<HTMLInputElement>();
  const passwordRef = useRef<HTMLInputElement>();
  const port = useSelector(state => state.kioskConfig.port);
  const debugEnabled = useSelector(state => state.kioskConfig.debug.enabled);
  const autoLaunchEnabled = useSelector(state => state.autoLaunch.enabled);
  const autoLoginEnabled = useSelector(state => state.autoLogin.enabled);
  const autoLoginValid = useSelector(state => state.autoLogin.valid);
  const injectScriptEnabled = useSelector(
    state => state.kioskConfig.injectScript.enabled
  );
  const injectScriptCode = useSelector(
    state => state.kioskConfig.injectScript.code
  );
  const dispatch = useDispatch();

  const autoLoginErrorText =
    autoLoginValid === false ? "Invalid credentials." : null;

  useEffect(() => {
    dispatch(readKioskConfig());
    dispatch(readAutoLogin());
    dispatch(readAutoLaunch());
  }, [dispatch]);

  const updateKioskConfigCallback = useCallback(
    (updatedKioskConfig: DeepPartial<KioskConfig>) => {
      dispatch(updateKioskConfig(updatedKioskConfig));
    },
    [dispatch]
  );

  const [debounceUpdateKioskConfigCallback] = useDebouncedCallback(
    updateKioskConfigCallback,
    1500
  );

  const updateAutoLaunchCallback = useCallback(
    (enabled: boolean) => dispatch(updateAutoLaunch(enabled)),
    [dispatch]
  );

  const updateAutoLoginCallback = useCallback(
    (enabled: boolean) => {
      const credentials =
        enabled &&
        [userNameRef, passwordRef].every(
          ref => ref.current && ref.current.value
        )
          ? {
              userName: userNameRef.current!.value,
              password: passwordRef.current!.value
            }
          : undefined;

      dispatch(
        updateAutoLogin({
          enabled,
          credentials
        })
      );
    },
    [dispatch, userNameRef, passwordRef]
  );

  const [debounceUpdateAutoLoginCallback] = useDebouncedCallback(
    updateAutoLoginCallback,
    1500
  );

  const deleteAutoLoginCallback = useCallback(() => {
    dispatch(deleteAutoLogin());
  }, [dispatch]);

  const editorRef = useRef<Editor>();

  const updateInjectedScript = useCallback(() => {
    if (editorRef.current) {
      updateKioskConfigCallback({
        injectScript: { enabled: true, code: editorRef.current.getValue() }
      });
    }
  }, [editorRef, updateKioskConfigCallback]);

  const [debounceUpdateInjectedScript] = useDebouncedCallback(
    updateInjectedScript,
    1500
  );

  const handleEditorDidMount = (_: () => string, editor: Editor) => {
    editorRef.current = editor;
    injectScriptCode && editorRef.current.setValue(injectScriptCode);
    editorRef.current.onDidChangeModelContent(debounceUpdateInjectedScript);
  };

  return (
    <form className={classes.form} spellCheck={false}>
      <Grid
        container
        justify="space-between"
        alignItems="center"
        className={classes.row}
      >
        <TextField
          label="Port"
          className={classes.inlineTextField}
          value={port}
          type="number"
          autoComplete="off"
          inputProps={{ min: 1, max: 65535 }}
          onChange={event =>
            debounceUpdateKioskConfigCallback({
              port: Number(event.target.value)
            })
          }
        />
      </Grid>

      <Divider light className={classes.divider} />

      <FormControlLabel
        control={
          <Switch
            checked={autoLaunchEnabled}
            color="primary"
            value="autoLaunch"
            onChange={event => updateAutoLaunchCallback(event.target.checked)}
          />
        }
        label={`Start Kiosk when ${operatingSystem} starts`}
        className={classes.row}
      />

      <Divider light className={classes.divider} />

      <Grid
        container
        justify="space-between"
        alignItems="center"
        className={classes.row}
      >
        <Grid item>
          <FormControlLabel
            control={
              <Switch
                checked={autoLoginEnabled}
                color="primary"
                value="autoLogin"
                onChange={event =>
                  updateAutoLoginCallback(event.target.checked)
                }
              />
            }
            label={`Logon to ${operatingSystem} automatically`}
          />
        </Grid>
        <Grid item>
          {autoLoginValid ? (
            <Button color="secondary" onClick={deleteAutoLoginCallback}>
              Reset credentials
            </Button>
          ) : (
            <FormGroup
              row
              style={{
                visibility: autoLoginEnabled ? "visible" : "hidden"
              }}
            >
              <TextField
                label="User Name"
                type="text"
                inputRef={userNameRef}
                className={classes.inlineTextField}
                error={autoLoginValid === false}
                helperText={autoLoginErrorText}
                autoComplete="off"
                onChange={() => debounceUpdateAutoLoginCallback(true)}
              />
              <TextField
                label="Password"
                type="password"
                inputRef={passwordRef}
                className={classes.inlineTextField}
                error={autoLoginValid === false}
                autoComplete="off"
                onChange={() => debounceUpdateAutoLoginCallback(true)}
              />
            </FormGroup>
          )}
        </Grid>
      </Grid>

      <Divider light className={classes.divider} />

      <FormControlLabel
        control={
          <Switch
            checked={injectScriptEnabled}
            color="primary"
            value="injectScript"
            onChange={event =>
              updateKioskConfigCallback({
                injectScript: {
                  enabled: event.target.checked,
                  code: injectScriptCode
                }
              })
            }
          />
        }
        label={`Inject custom JavaScript in windows`}
        className={classes.row}
      />

      {injectScriptEnabled && (
        <Paper elevation={2}>
          <Editor
            height="30vh"
            language="javascript"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false
            }}
            editorDidMount={handleEditorDidMount}
          />
        </Paper>
      )}

      <Divider light className={classes.divider} />

      <Tooltip title="Enable DevTools, disable window full screen and focus">
        <FormControlLabel
          control={
            <Switch
              checked={debugEnabled}
              color="primary"
              value="debug"
              onChange={event =>
                updateKioskConfigCallback({
                  debug: { enabled: event.target.checked }
                })
              }
            />
          }
          label={`Debug Kiosk`}
          className={classes.row}
        />
      </Tooltip>
    </form>
  );
};
