import React, { FC, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Textfit } from "react-textfit";
import { Theme, Fab, Typography, IconButton, Box } from "@material-ui/core";
import { createStyles, makeStyles } from "@material-ui/styles";
import { Settings } from "@material-ui/icons";
import { ReactComponent as KioskLogo } from "./KioskLogo.svg";
import { kioskParams } from "./KioskParams";
import { open } from "./Actions";
import { overlayContentSize } from "../shared/Style";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    text: {
      margin: theme.spacing(0, 1)
    },
    textContainer: {
      textOverflow: "ellipsis",
      overflow: "hidden"
    },
    logo: {
      width: 32
    },
    root: {
      width: overlayContentSize.width,
      height: overlayContentSize.height
    },
    fab: {},
    settings: {
      "-webkit-app-region": "no-drag !important"
    }
  })
);

export const Overlay: FC = () => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const updateStatusCallback = useCallback(
    (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      e.preventDefault();
      dispatch(open());
    },
    [dispatch]
  );

  useEffect(() => {
    document.body.classList.add("transparent");
    return () => document.body.classList.remove("transparent");
  }, []);

  return (
    <Fab variant="extended" color="primary" className={classes.fab}>
      <Box display="flex" alignItems="center" className={classes.root}>
        <Box display="flex">
          <KioskLogo className={classes.logo} />
        </Box>
        <Box flexGrow={1} className={classes.textContainer}>
          <Typography variant="button" className={classes.text}>
            <Textfit mode="single">
              {`http://${kioskParams.host}:${kioskParams.port}`}
            </Textfit>
          </Typography>
        </Box>
        <Box>
          <IconButton
            onClick={updateStatusCallback}
            className={classes.settings}
            color="inherit"
          >
            <Settings />
          </IconButton>
        </Box>
      </Box>
    </Fab>
  );
};
