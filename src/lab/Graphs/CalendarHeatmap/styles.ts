import { makeStyles, Theme } from "@material-ui/core";

interface StyleProps {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

const useStyles = makeStyles((theme: Theme) => ({
  tooltipStyles: {
    marginLeft: "3.5rem",
    marginTop: "0.5rem",
    transform: "translate(-50%,0)",
    backgroundColor: `${theme.palette.background.paper} !important`,
  },
  xAxisLabels: {
    color: theme.palette.text.primary,
    fontWeight: 400,
    fontSize: "0.75rem",
    lineHeight: "1.275rem",
  },
  xAxis: (props: StyleProps) => ({
    display: "flex",
    justifyContent: "space-around",
    width: props.width,
    paddingLeft: props.margin.left,
    marginRight: props.margin.right,
    background: theme.palette.background.paper,
  }),
}));

export { useStyles };
