"use client";

import React from "react";

export type ViewportInfo = {
  scale: number;
  containerLeft: number;
  containerTop: number;
  containerWidth: number;
  containerHeight: number;
};

export const ViewportContext = React.createContext<ViewportInfo>({
  scale: 1,
  containerLeft: 0,
  containerTop: 0,
  containerWidth: 1280,
  containerHeight: 720,
});

export default ViewportContext;
