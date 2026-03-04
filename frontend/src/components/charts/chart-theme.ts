import { CHART_THEME } from '@/lib/constants';

export const chartMargin = { top: 5, right: 20, bottom: 5, left: 0 };

export const axisStyle = {
  tick: { fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize },
  axisLine: { stroke: CHART_THEME.gridColor },
};

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: CHART_THEME.tooltipBg,
    border: `1px solid ${CHART_THEME.tooltipBorder}`,
    borderRadius: '8px',
    color: '#e8e8ed',
    fontSize: 12,
  },
};
