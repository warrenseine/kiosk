import React, {
  FC,
  useEffect,
  useRef,
  useState,
  MutableRefObject
} from "react";
import clsx from "clsx";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import { Fab, CircularProgress, Fade } from "@material-ui/core";
import { Check, Save } from "@material-ui/icons";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      margin: theme.spacing(1),
      position: "relative"
    },
    button: {
      pointerEvents: "none"
    },
    success: {
      backgroundColor: green[500]
    },
    loading: {
      color: theme.palette.primary.dark,
      position: "absolute",
      top: -6,
      left: -6,
      zIndex: 1
    }
  })
);

const delay = (
  timer: MutableRefObject<number>,
  handler?: TimerHandler,
  timeout?: number
) => {
  clearTimeout(timer.current);
  timer.current = handler ? window.setTimeout(handler, timeout) : 0;
};

enum SaveStatus {
  Idle,
  Loading,
  Success
}

interface SaveIndicatorProps {
  className?: string;
  pending: boolean;
}

export const SaveIndicator: FC<SaveIndicatorProps> = ({
  className,
  pending
}) => {
  const classes = useStyles();
  const [status, setStatus] = useState(SaveStatus.Idle);
  const timer = useRef(0);

  useEffect(() => {
    if (pending) {
      setStatus(SaveStatus.Loading);
      delay(
        timer,
        () => {
          setStatus(SaveStatus.Success);
          delay(
            timer,
            () => {
              setStatus(SaveStatus.Idle);
            },
            2000
          );
        },
        2000
      );
    }

    // return () => delay(timer);
  }, [pending, timer]);

  return (
    <div className={className}>
      <Fade
        in={status === SaveStatus.Loading}
        timeout={{
          enter: 0,
          exit: 2500
        }}
        mountOnEnter
        unmountOnExit
      >
        <div>
          <Fab
            color="primary"
            className={clsx({
              [classes.button]: true,
              [classes.success]: status === SaveStatus.Success
            })}
          >
            {status === SaveStatus.Success ? <Check /> : <Save />}
          </Fab>
          {status === SaveStatus.Loading && (
            <CircularProgress size={68} className={classes.loading} />
          )}
        </div>
      </Fade>
    </div>
  );
};
