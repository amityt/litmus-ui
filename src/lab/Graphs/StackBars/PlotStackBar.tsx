import { useTheme } from "@material-ui/core";
import { AxisBottom } from "@visx/axis";
import { Grid } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear, scaleOrdinal, scaleTime } from "@visx/scale";
import { BarStack } from "@visx/shape";
import { useTooltip } from "@visx/tooltip";
import {
  AxisLeft,
  curveMonotoneX,
  LinePath,
  localPoint,
  Tooltip,
} from "@visx/visx";
import React, { useCallback, useMemo } from "react";
import {
  BarDateValue,
  BarStackChildProps,
  StackBarMetric,
  StackBarTooltipProps,
  TooltipData,
  ToolTipDateValue,
} from "./base";
import { useStyles } from "./styles";
import {
  bisectBarDate,
  bisectLineDate,
  dateFormat,
  getBarDateNum,
  getDateNumber,
  getLineDateNum,
  getValueNum,
  getValueStr,
  intToString,
} from "./utils";

type StackName = "passPercentage" | "failPercentage";

const defaultMargin = { top: 20, right: 50, bottom: 30, left: 80 };
const keys: StackName[] = ["passPercentage", "failPercentage"];

// accessors
const getDateStr = (d: StackBarMetric) => d.date.toString();

// scales

const PlotStackBar = ({
  width,
  height,
  initialxAxisDate,
  margin = defaultMargin,
  xAxistimeFormat = "MMM D,YYYY ",
  unit = "%",
  yLabel = "",
  yLabelOffset = 0,
  handleBarClick,
  barSeries,
  openSeries,
  StackBarTooltip = ({ tooltipData }: StackBarTooltipProps) => {
    return (
      <div>
        {tooltipData.map((linedata, index) => (
          <div
            key={`tooltipName-value- ${linedata.metricName}-${index}`}
            style={{ lineHeight: "1.3rem" }}
          >
            <span>{`${linedata.metricName} ${getValueStr(
              linedata.data
            )}`}</span>
          </div>
        ))}
      </div>
    );
  },
}: BarStackChildProps) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<TooltipData>({
    tooltipOpen: true,
  });
  const classes = useStyles({
    width,
    height,
  });
  const { palette } = useTheme();
  const colorScale = scaleOrdinal<StackName, string>({
    domain: keys,
    range: [
      palette.status.experiment.completed,
      palette.status.experiment.failed,
    ],
  });

  const dateScale = scaleBand<string>({
    domain: barSeries.map(getDateStr),
    padding: 0.5,
  });
  const axisLeftTickLabelProps = {
    dy: "0.3rem",
    dx: "-0.3rem",
    fontWeight: 400,
    fontSize: "10px",
    textAnchor: "end" as const,
    lineHeight: "12px",
    fill: palette.text.hint,
  };
  const axisBottomTickLabelProps = {
    dy: "0.3rem",
    textAnchor: "middle" as const,
    fontSize: "12px",
    fontWeight: 400,
    fill: palette.text.hint,
    lineHeight: "12px",
  };
  const yLabelProps = {
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: "12px",
    color: palette.text.hint,
    fill: palette.text.hint,
  };

  // bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const localInitialxAxisDate = initialxAxisDate ?? barSeries[0].date ?? 0;
  const xScale = useMemo(
    () =>
      scaleTime<number>({
        range: [0, xMax],
        domain: [
          new Date(
            Math.min(
              ...barSeries.map((element) => element.date),
              localInitialxAxisDate
            )
          ),
          new Date(Math.max(...barSeries.map((element) => element.date))),
        ],
      }),
    [barSeries, localInitialxAxisDate, xMax]
  );
  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        domain: [0, 100],
        nice: true,
      }),
    [yMax]
  );

  dateScale.rangeRound([0, xMax]);

  // tooltip handler

  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>
    ) => {
      let pointerDataSelection: ToolTipDateValue[] = [
        {
          metricName: "",
          data: {
            date: NaN,
            value: NaN,
          },
          baseColor: "",
        },
      ];
      let { x } = localPoint(event) || { x: 0 };
      x -= margin.left;
      const x0 = xScale.invert(x);

      let i = 0;
      pointerDataSelection.slice(0);
      if (openSeries) {
        const indexer = bisectLineDate(openSeries.data, x0, 1);
        const dd0 = openSeries.data[indexer - 1] ?? undefined;
        const dd1 = openSeries.data[indexer] ?? undefined;

        if (dd1) {
          pointerDataSelection[i] =
            x0.valueOf() - getLineDateNum(dd0).valueOf() >
            getLineDateNum(dd1).valueOf() - x0.valueOf()
              ? {
                  metricName: "resiliencyScore",
                  data: {
                    date: dd1.date,
                    value: dd1.value,
                  },
                  baseColor:
                    openSeries.baseColor ?? palette.status.experiment.running,
                }
              : {
                  metricName: "resiliencyScore",
                  data: {
                    date: dd0.date,
                    value: dd0.value,
                  },
                  baseColor:
                    openSeries.baseColor ?? palette.status.experiment.running,
                };
          i++;
        }
      }
      // 1
      if (barSeries) {
        const indexer = bisectBarDate(barSeries, x0, 1);
        const dd0 = barSeries[indexer - 1] ?? undefined;
        const dd1 = barSeries[indexer] ?? undefined;

        //3
        if (dd1) {
          pointerDataSelection[i] =
            x0.valueOf() - getBarDateNum(dd0).valueOf() >
            getBarDateNum(dd1).valueOf() - x0.valueOf()
              ? {
                  metricName: "passCount",
                  data: {
                    date: dd1.date,
                    id: dd1.id,
                    value: dd1.passCount,
                  },
                  baseColor: "red",
                }
              : {
                  metricName: "passCount",
                  data: {
                    date: dd0.date,
                    id: dd0.id,
                    value: dd0.passCount,
                  },
                  baseColor: "red",
                };
          i++;
        }
        //4
        if (dd1) {
          pointerDataSelection[i] =
            x0.valueOf() - getBarDateNum(dd0).valueOf() >
            getBarDateNum(dd1).valueOf() - x0.valueOf()
              ? {
                  metricName: "failCount",
                  data: {
                    date: dd1.date,
                    id: dd1.id,
                    value: dd1.failCount,
                  },
                  baseColor: "red",
                }
              : {
                  metricName: "failCount",
                  data: {
                    date: dd0.date,
                    id: dd0.id,
                    value: dd0.failCount,
                  },
                  baseColor: "red",
                };
          i++;
        }
      }

      const firstToolTipData = pointerDataSelection[0];
      pointerDataSelection = pointerDataSelection.filter(
        (elem) =>
          elem.data &&
          firstToolTipData.data &&
          elem.data.date <= firstToolTipData.data.date
      );
      if (width < 10) return null;
      const tooltipLeftValue =
        pointerDataSelection[pointerDataSelection.length - 1] &&
        pointerDataSelection[0].data
          ? xScale(getLineDateNum(pointerDataSelection[0].data))
          : xScale(xMax);

      showTooltip({
        tooltipData: pointerDataSelection,
        tooltipLeft: tooltipLeftValue,
        tooltipTop: yMax / 2,
      });
    },

    [
      width,
      xScale,
      xMax,
      showTooltip,
      yMax,
      margin.left,
      openSeries,
      barSeries,
      palette,
    ]
  );

  if (width < 10) return null;

  return width < 10 ? null : (
    <div style={{ position: "relative", margin: "1rem" }}>
      <svg width={width} height={height} onMouseLeave={() => hideTooltip()}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={"white"}
          rx={14}
        />
        <defs>
          <filter id="inset" x="-50%" y="-50%" width="200%" height="200%">
            <feFlood
              floodColor={
                openSeries?.baseColor ?? palette.status.experiment.running
              }
              result="outside-color"
            />
            <feMorphology in="SourceAlpha" operator="dilate" radius="1" />
            <feComposite
              in="outside-color"
              operator="in"
              result="outside-stroke"
            />

            <feFlood
              floodColor={palette.background.paper}
              result="inside-color"
            />
            <feComposite
              in2="SourceAlpha"
              operator="in"
              result="inside-stroke"
            />

            <feMorphology in="SourceAlpha" radius="1.5" />
            <feComposite in="SourceGraphic" operator="in" result="fill-area" />

            <feMerge>
              <feMergeNode in="outside-stroke" />
              <feMergeNode in="inside-stroke" />
              <feMergeNode in="fill-area" />
            </feMerge>
          </filter>
        </defs>
        <Grid
          top={margin.top}
          left={margin.left}
          xScale={dateScale}
          yScale={yScale}
          width={xMax}
          height={yMax}
          stroke={palette.border.main}
          strokeOpacity={0.1}
        />
        <AxisLeft
          scale={yScale}
          numTicks={height > 200 ? 7 : 6}
          hideAxisLine
          hideTicks
          tickFormat={(num) => intToString(num.valueOf(), unit)}
          tickLabelProps={() => axisLeftTickLabelProps}
          label={yLabel}
          labelProps={yLabelProps}
          left={margin.left}
          labelOffset={yLabelOffset}
          top={margin.top}
        />
        <AxisBottom
          numTicks={width > 520 ? 6 : 5}
          hideTicks
          top={yMax + margin.top}
          left={margin.left}
          scale={xScale}
          stroke={palette.border.main}
          tickStroke={palette.text.primary}
          tickFormat={(num) => dateFormat(num.valueOf(), xAxistimeFormat)}
          tickLabelProps={() => axisBottomTickLabelProps}
        />
        <Group top={margin.top} left={margin.left}>
          <BarStack<StackBarMetric, StackName>
            data={barSeries}
            keys={keys}
            x={getDateStr}
            xScale={dateScale}
            yScale={yScale}
            color={colorScale}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => {
                  return (
                    <rect
                      key={`bar-stack-${barStack.index}-${bar.index}`}
                      x={xScale(bar.bar.data.date ?? 0) - bar.width / 2}
                      y={bar.y}
                      height={bar.height}
                      width={bar.width}
                      opacity={
                        tooltipData && tooltipData[0]
                          ? getDateNumber(bar.bar.data.date) ===
                            getDateNumber(tooltipData[0].data.date)
                            ? 1
                            : 0.4
                          : 1
                      }
                      fill={bar.color}
                    />
                  );
                })
              )
            }
          </BarStack>
          {openSeries && (
            <Group>
              <LinePath
                data={openSeries.data}
                x={(d) => xScale(getLineDateNum(d)) ?? 0}
                y={(d) => yScale(getValueNum(d)) ?? 0}
                strokeWidth={2}
                stroke={
                  openSeries.baseColor ?? palette.status.experiment.running
                }
                strokeOpacity={0.7}
                curve={curveMonotoneX}
              />
              {openSeries.data.map((d: BarDateValue, index) => (
                <g
                  key={`dataPoint-${d.date}-${d.value}-${openSeries.metricName}-${index}`}
                >
                  <circle
                    cx={xScale(getLineDateNum(d))}
                    cy={yScale(getValueNum(d))}
                    r={8}
                    filter="url(#inset)"
                    fill={
                      openSeries.baseColor ?? palette.status.experiment.running
                    }
                    fillOpacity={
                      tooltipData && tooltipData[0]
                        ? getDateNumber(d.date) ===
                          getDateNumber(tooltipData[0].data.date)
                          ? 1
                          : 0.8
                        : 1
                    }
                    pointerEvents="none"
                  />
                </g>
              ))}
            </Group>
          )}
        </Group>
        <Group>
          <rect
            x={margin.left}
            y={margin.top}
            width={xMax}
            height={yMax}
            onMouseMove={handleTooltip}
            fill={"transparent"}
            onClick={() => {
              handleBarClick &&
                handleBarClick(
                  tooltipData
                    ? tooltipData[tooltipData.length - 1].data.id ?? null
                    : null
                );
            }}
          />
        </Group>
      </svg>
      {tooltipData && tooltipData[0] && (
        <Tooltip
          left={tooltipLeft}
          top={tooltipTop}
          // Hardcoded value for tooltip
          // will be removed later
          className={`${classes.tooltipMetric} ${
            xMax - tooltipLeft < 200
              ? classes.tooltipMetricLeft
              : classes.tooltipMetricRight
          }`}
        >
          <StackBarTooltip tooltipData={tooltipData} />
        </Tooltip>
      )}
    </div>
  );
};

export { PlotStackBar };
