'use client';

import { COURT } from '@/lib/constants';
import type { ReactNode } from 'react';

interface CourtProps {
  children?: ReactNode;
  className?: string;
}

export function Court({ children, className }: CourtProps) {
  const {
    WIDTH, HEIGHT, BASKET_X, BASKET_Y, BASKET_RADIUS, BACKBOARD_WIDTH,
    PAINT_WIDTH, PAINT_HEIGHT, FREE_THROW_RADIUS,
    THREE_PT_RADIUS, THREE_PT_SIDE_Y, THREE_PT_SIDE_X,
    RESTRICTED_RADIUS,
  } = COURT;

  const lineColor = 'var(--border)';
  const lineWidth = 1;

  // Three-point arc: from left corner to right corner
  const threeArcStartX = WIDTH / 2 - THREE_PT_SIDE_X;
  const threeArcEndX = WIDTH / 2 + THREE_PT_SIDE_X;
  const threeArcY = THREE_PT_SIDE_Y;

  // Calculate the arc path for the 3-point line
  const threeArc = `
    M ${threeArcStartX} ${threeArcY}
    A ${THREE_PT_RADIUS} ${THREE_PT_RADIUS} 0 0 1 ${threeArcEndX} ${threeArcY}
  `;

  // Restricted area arc
  const restrictedArc = `
    M ${BASKET_X - RESTRICTED_RADIUS} ${BASKET_Y}
    A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 0 1 ${BASKET_X + RESTRICTED_RADIUS} ${BASKET_Y}
  `;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      width="100%"
      height="auto"
    >
      {/* Background */}
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--bg-card)" rx={8} />

      {/* Outer boundary */}
      <rect
        x={0} y={0} width={WIDTH} height={HEIGHT}
        fill="none" stroke={lineColor} strokeWidth={lineWidth}
        rx={8}
      />

      {/* Paint / Key */}
      <rect
        x={(WIDTH - PAINT_WIDTH) / 2}
        y={0}
        width={PAINT_WIDTH}
        height={PAINT_HEIGHT}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
      />

      {/* Free throw circle (top half solid, bottom half dashed) */}
      <circle
        cx={BASKET_X}
        cy={PAINT_HEIGHT}
        r={FREE_THROW_RADIUS}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
        strokeDasharray="4 4"
      />
      {/* Solid top half of free throw circle */}
      <path
        d={`M ${BASKET_X - FREE_THROW_RADIUS} ${PAINT_HEIGHT}
            A ${FREE_THROW_RADIUS} ${FREE_THROW_RADIUS} 0 0 1 ${BASKET_X + FREE_THROW_RADIUS} ${PAINT_HEIGHT}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
      />

      {/* Backboard */}
      <line
        x1={BASKET_X - BACKBOARD_WIDTH / 2}
        y1={BASKET_Y - 10}
        x2={BASKET_X + BACKBOARD_WIDTH / 2}
        y2={BASKET_Y - 10}
        stroke={lineColor}
        strokeWidth={lineWidth + 1}
      />

      {/* Basket */}
      <circle
        cx={BASKET_X}
        cy={BASKET_Y}
        r={BASKET_RADIUS}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth + 0.5}
      />

      {/* Three-point line: corners */}
      <line
        x1={threeArcStartX} y1={0}
        x2={threeArcStartX} y2={threeArcY}
        stroke={lineColor} strokeWidth={lineWidth}
      />
      <line
        x1={threeArcEndX} y1={0}
        x2={threeArcEndX} y2={threeArcY}
        stroke={lineColor} strokeWidth={lineWidth}
      />

      {/* Three-point arc */}
      <path
        d={threeArc}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
      />

      {/* Restricted area */}
      <path
        d={restrictedArc}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
      />

      {/* Shot layers */}
      {children}
    </svg>
  );
}
