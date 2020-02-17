import React, { FC } from "react";
import { Theme, Tooltip, Chip } from "@material-ui/core";
import { createStyles, makeStyles } from "@material-ui/styles";
import { Airplay } from "@material-ui/icons";
import { kioskParams } from "./KioskParams";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tooltip: {
      maxWidth: 200
    },
    arrow: {
      marginLeft: theme.spacing(1)
    },
    chip: {
      textTransform: "uppercase"
    }
  })
);

export const AddressBubble: FC = () => {
  const classes = useStyles();

  return (
    <Tooltip
      title="Connect to this address from a remote browser to configure Kiosk"
      placement="bottom"
      classes={{ tooltip: classes.tooltip }}
    >
      <Chip
        label={`http://${kioskParams.host}:${kioskParams.port}`}
        color="secondary"
        icon={<Airplay className={classes.arrow} />}
        className={classes.chip}
      />
    </Tooltip>
  );
};
