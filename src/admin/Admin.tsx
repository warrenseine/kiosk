import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { createStyles, makeStyles } from "@material-ui/styles";
import {
  AppBar,
  Toolbar,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  Typography,
  Paper,
  Grid,
  Theme,
  Button,
  Box,
  Tooltip
} from "@material-ui/core";
import {
  Add,
  ExpandMore,
  Settings,
  Web,
  PowerSettingsNew,
  Refresh
} from "@material-ui/icons";
import { KioskWindow } from "../shared/KioskWindow";
import { ReactComponent as KioskLogo } from "./KioskLogo.svg";
import { SettingsPanel } from "./SettingsPanel";
import { AddressBubble } from "./AddressBubble";
import { WindowConfigurationPanel } from "./WindowConfigurationPanel";
import { SaveIndicator } from "./SaveIndicator";
import { useSelector } from "./Store";
import {
  createKioskWindow,
  deleteKioskWindow,
  restart,
  refresh
} from "./Actions";
import { tryOrElse } from "../shared/Try";
import lodash from "lodash";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%"
    },
    logo: {
      width: 42
    },
    title: {
      marginLeft: theme.spacing(2),
      flexGrow: 1,
      fontFamily: "Pacifico"
    },
    content: {
      padding: theme.spacing(3, 2),
      position: "relative"
    },
    window: {
      paddingTop: 0
    },
    row: {
      flexGrow: 1,
      width: "100%" // Unnecessary, but somehow there's a bug where flexGrow is not respected anymore after a reflow.
    },
    heading: {
      verticalAlign: "middle",
      display: "inline-flex",
      flexBasis: "33.33%",
      flexShrink: 0
    },
    startIcon: {
      marginRight: theme.spacing(1)
    },
    lastButton: {
      marginLeft: theme.spacing(1)
    },
    fab: {
      position: "fixed",
      right: theme.spacing(2),
      bottom: theme.spacing(2)
    }
  })
);

const buildUrlList = (urls: string[]) =>
  lodash
    .uniq(
      urls
        .map(url => tryOrElse(() => new URL(url).host, null))
        .filter(url => url)
    )
    .join(", ");

export const Admin: FC = () => {
  const classes = useStyles();
  const windows = useSelector(state => state.kioskConfig.windows);
  const pending = useSelector(state => state.pendingRequests > 0);
  const dispatch = useDispatch();

  const createWindowCallback = useCallback(() => {
    dispatch(createKioskWindow());
  }, [dispatch]);

  const removeWindowCallback = useCallback(
    (window: KioskWindow) => {
      dispatch(deleteKioskWindow(window));
    },
    [dispatch]
  );

  const restartCallback = useCallback(() => dispatch(restart()), [dispatch]);

  const refreshCallback = useCallback(() => dispatch(refresh()), [dispatch]);

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <KioskLogo className={classes.logo} />
          <Typography variant="h4" className={classes.title}>
            Kiosk
          </Typography>
          <AddressBubble />
        </Toolbar>
      </AppBar>
      <Paper elevation={0} className={classes.content}>
        <Grid container direction="column" alignItems="stretch" spacing={2}>
          <Grid item className={classes.row}>
            <ExpansionPanel defaultExpanded={false} className={classes.window}>
              <ExpansionPanelSummary expandIcon={<ExpandMore />}>
                <Typography className={classes.heading}>
                  <Settings className={classes.startIcon} /> Settings
                </Typography>
              </ExpansionPanelSummary>

              <ExpansionPanelDetails>
                <SettingsPanel />
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Grid>
          <Grid item className={classes.row}>
            {windows.map((window, index) => {
              return (
                <ExpansionPanel
                  defaultExpanded={true}
                  className={classes.window}
                  key={window.id}
                >
                  <ExpansionPanelSummary expandIcon={<ExpandMore />}>
                    <Typography className={classes.heading}>
                      <Web className={classes.startIcon} />{" "}
                      {window.name || `Unnamed window ${index + 1}`}
                    </Typography>
                    <Typography color="textSecondary">
                      {buildUrlList(window.urls)}
                    </Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails>
                    <WindowConfigurationPanel
                      window={window}
                      removeWindow={() => removeWindowCallback(window)}
                    />
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              );
            })}
          </Grid>
          <Grid item>
            <Box display="flex">
              <Box flexGrow={1}>
                <Tooltip title={"Restart the computer"}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<PowerSettingsNew />}
                    onClick={restartCallback}
                  >
                    Restart
                  </Button>
                </Tooltip>
              </Box>
              <Box>
                <Tooltip
                  title={
                    "Close and re-open windows, effectively refreshing configuration"
                  }
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Refresh />}
                    onClick={refreshCallback}
                  >
                    Refresh
                  </Button>
                </Tooltip>
                <Tooltip title={"Add a new window"}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    className={classes.lastButton}
                    onClick={createWindowCallback}
                  >
                    Add
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      <SaveIndicator className={classes.fab} pending={pending} />
    </div>
  );
};
