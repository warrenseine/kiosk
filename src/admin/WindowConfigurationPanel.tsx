import React, {
  FC,
  useRef,
  useCallback,
  useEffect,
  useState,
  Fragment,
  RefObject
} from "react";
import { createStyles, makeStyles } from "@material-ui/styles";
import {
  Theme,
  Avatar,
  IconButton,
  Grid,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Button,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  InputAdornment
} from "@material-ui/core";
import { Web, Delete } from "@material-ui/icons";
import moment from "moment";
import lodash from "lodash";
import { useDebouncedCallback } from "use-debounce";
import { KioskWindow, Rectangle } from "../shared/KioskWindow";
import { useDispatch } from "react-redux";
import { ReactComponent as WindowWireframe } from "./WindowWireframe.svg";
import {
  updateKioskWindow,
  captureWindowScreenshot,
  readDisplays
} from "./Actions";
import { useSelector } from "./Store";
import { tryDispatch } from "../shared/Try";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    media: {
      width: "100%",
      cursor: "pointer"
    },
    button: {
      margin: theme.spacing(2, 0)
    },
    divider: {
      margin: theme.spacing(2, 0)
    },
    urls: {
      paddingBottom: theme.spacing(1)
    },
    gutters: {
      paddingLeft: 0
    },
    form: {
      width: "100%"
    },
    selectFormControl: {
      minWidth: 200
    },
    select: {},
    textField: {},
    shortTextField: {
      width: 120
    },
    switch: {
      paddingBottom: `${theme.spacing(1)}px !important` as any
    },
    actions: {
      marginLeft: "auto"
    },
    text: {
      margin: theme.spacing(2, 0),
      fontStyle: "italic"
    }
  })
);

const unrefNumber = (ref: RefObject<HTMLInputElement | HTMLSelectElement>) =>
  Number(ref.current?.value);

const unrefStringList = (refs: RefObject<Map<string, HTMLInputElement>>) =>
  Array.from(refs.current!.values())
    .map((input: HTMLInputElement) => input.value)
    .filter(url => url);

interface WindowConfigurationPanelProps {
  window: KioskWindow;
  removeWindow: () => void;
}

export const WindowConfigurationPanel: FC<WindowConfigurationPanelProps> = ({
  window,
  removeWindow
}) => {
  const classes = useStyles();
  const nameRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLSelectElement>(null);
  const urlRefs = useRef(new Map<string, HTMLInputElement>());
  const xBoundsRef = useRef<HTMLInputElement>(null);
  const yBoundsRef = useRef<HTMLInputElement>(null);
  const widthBoundsRef = useRef<HTMLInputElement>(null);
  const heightBoundsRef = useRef<HTMLInputElement>(null);
  const fullScreenRef = useRef<HTMLInputElement>(null);
  const cycleRef = useRef<HTMLInputElement>(null);
  const screenshot = useSelector(state => state.screenshots.data[window.id]);
  const displays = useSelector(state => state.displays);
  const dispatch = useDispatch();

  const [urls, setUrls] = useState<string[]>([...window.urls, ""]);
  const [fullScreen, setFullScreen] = useState<boolean>(window.fullScreen);

  useEffect(() => {
    dispatch(readDisplays());
  }, [dispatch]);

  const tryCaptureWindowScreenshot = useCallback(
    () =>
      urls.some(url => url) &&
      tryDispatch(captureWindowScreenshot(window), dispatch),
    [window, dispatch, urls]
  );

  useEffect(() => {
    const t = setTimeout(() => tryCaptureWindowScreenshot(), 3000);
    return () => clearTimeout(t);
  }, [tryCaptureWindowScreenshot]);

  const updateWindowCallback = useCallback(() => {
    const name = nameRef.current!.value;
    const urls = unrefStringList(urlRefs);

    if (urls.length === 0) {
      return;
    }

    const cycle = unrefNumber(cycleRef);
    const display = unrefNumber(displayRef);
    const fullScreen = Boolean(fullScreenRef.current!.checked);

    const bounds: Rectangle | undefined = fullScreen
      ? { ...window.bounds }
      : {
          x: unrefNumber(xBoundsRef),
          y: unrefNumber(yBoundsRef),
          width: unrefNumber(widthBoundsRef),
          height: unrefNumber(heightBoundsRef)
        };

    if (bounds && Object.values(bounds).some(Number.isNaN)) return;

    const updatedWindow: KioskWindow = {
      id: window.id,
      display,
      name,
      fullScreen,
      urls,
      cycle,
      bounds
    };

    if (!lodash.isEqual(updatedWindow, window)) {
      dispatch(updateKioskWindow(updatedWindow));
    }
  }, [
    nameRef,
    urlRefs,
    xBoundsRef,
    yBoundsRef,
    widthBoundsRef,
    heightBoundsRef,
    displayRef,
    fullScreenRef,
    dispatch,
    window
  ]);

  const [debounceUpdateWindowCallback] = useDebouncedCallback(
    updateWindowCallback,
    1500
  );

  const deleteUrl = (index: number) => {
    setUrls([...urls.slice(0, index), ...urls.splice(index + 1)]);
    debounceUpdateWindowCallback();
  };

  const updateUrlsCallback = useCallback(() => {
    setUrls(unrefStringList(urlRefs).concat([""]));
    debounceUpdateWindowCallback();
  }, [urlRefs, setUrls, debounceUpdateWindowCallback]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={3}>
        {screenshot ? (
          <Tooltip title={moment(screenshot.date).fromNow()}>
            <img
              className={classes.media}
              src={screenshot.dataUri}
              alt="Screenshot"
              onClick={tryCaptureWindowScreenshot}
            />
          </Tooltip>
        ) : (
          <WindowWireframe />
        )}
      </Grid>
      <Grid item xs={12} sm={9}>
        <form
          className={classes.form}
          onSubmit={updateWindowCallback}
          spellCheck={false}
        >
          <List className={classes.urls}>
            {urls.map((url, index) => {
              const key = `url-${index}`;
              return (
                <ListItem
                  dense
                  classes={{
                    gutters: classes.gutters,
                    root: classes.urls
                  }}
                  key={key}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <Web />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <TextField
                        label="URL"
                        className={classes.textField}
                        defaultValue={url}
                        type="url"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        inputRef={input =>
                          input === null
                            ? urlRefs.current.delete(key)
                            : urlRefs.current.set(key, input)
                        }
                        multiline
                        fullWidth
                        onKeyPress={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                          }
                        }}
                        onChange={debounceUpdateWindowCallback}
                        onBlur={updateUrlsCallback}
                      />
                    }
                  />
                  {url.length > 0 && (
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => deleteUrl(index)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              );
            })}
          </List>

          {urls.length > 2 && (
            <TextField
              label="Rotation"
              className={classes.shortTextField}
              defaultValue={window.cycle}
              type="number"
              autoComplete="off"
              inputProps={{ min: 0 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">seconds</InputAdornment>
                )
              }}
              inputRef={cycleRef}
              onChange={debounceUpdateWindowCallback}
            />
          )}

          <Divider light className={classes.divider} />

          <TextField
            label="Name"
            className={classes.textField}
            defaultValue={window.name}
            type="text"
            autoComplete="off"
            fullWidth
            inputRef={nameRef}
            onChange={debounceUpdateWindowCallback}
          />

          <Divider light className={classes.divider} />

          <Grid container direction="row" spacing={3} alignItems="flex-end">
            <Grid item>
              <FormControl className={classes.selectFormControl}>
                <Tooltip title="IDs are hashes of underlying system display names">
                  <InputLabel id={`display-${window.id}`}>Display</InputLabel>
                </Tooltip>
                {displays.length && (
                  <Select
                    labelId={`display-${window.id}`}
                    className={classes.select}
                    defaultValue={window.display}
                    onChange={debounceUpdateWindowCallback}
                    inputRef={displayRef}
                  >
                    {displays.map(display => (
                      <MenuItem
                        value={display.id}
                        key={`display-${window.id}-${display.id}`}
                      >
                        Display {display.id}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            </Grid>

            <Grid item className={classes.switch}>
              <FormControlLabel
                control={
                  <Switch
                    defaultChecked={fullScreen}
                    color="primary"
                    value="fullScreen"
                    inputRef={fullScreenRef}
                    onChange={event => {
                      setFullScreen(event.target.checked);
                      debounceUpdateWindowCallback();
                    }}
                  />
                }
                label={`Full Screen`}
              />
            </Grid>
          </Grid>

          {!fullScreen && (
            <Fragment>
              <Divider light className={classes.divider} />

              <Grid container direction="row" spacing={3}>
                <Grid item>
                  <TextField
                    label="Left Offset"
                    className={classes.textField}
                    defaultValue={window.bounds.x}
                    type="number"
                    autoComplete="off"
                    inputRef={xBoundsRef}
                    onChange={debounceUpdateWindowCallback}
                  />
                </Grid>
                <Grid item>
                  <TextField
                    label="Top Offset"
                    className={classes.textField}
                    defaultValue={window.bounds.y}
                    type="number"
                    autoComplete="off"
                    inputRef={yBoundsRef}
                    onChange={debounceUpdateWindowCallback}
                  />
                </Grid>
                <Grid item>
                  <TextField
                    label="Width"
                    className={classes.textField}
                    defaultValue={window.bounds.width}
                    type="number"
                    autoComplete="off"
                    inputRef={widthBoundsRef}
                    onChange={debounceUpdateWindowCallback}
                  />
                </Grid>
                <Grid item>
                  <TextField
                    label="Height"
                    className={classes.textField}
                    defaultValue={window.bounds.height}
                    type="number"
                    autoComplete="off"
                    inputRef={heightBoundsRef}
                    onChange={debounceUpdateWindowCallback}
                  />
                </Grid>
              </Grid>
            </Fragment>
          )}

          <Divider light className={classes.divider} />

          <Tooltip title="Remove the window">
            <Button
              variant="contained"
              color="secondary"
              className={classes.actions}
              onClick={removeWindow}
              startIcon={<Delete />}
            >
              Remove
            </Button>
          </Tooltip>
        </form>
      </Grid>
    </Grid>
  );
};
