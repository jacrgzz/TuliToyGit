"use client";
import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

// three solo en el cliente: el HTML del servidor trae la pantalla de carga, el fondo y el texto.
const OsitoScene = dynamic(() => import("./OsitoScene"), { ssr: false });

type Props = {
  /** El hero ya se desvaneció (el grid tomó su lugar) y el osito deja de dibujarse. */
  paused?: boolean;
  /** Primer cuadro del osito dibujado. */
  onReady?: () => void;
  /** No se pudo dibujar (sin WebGL o error de carga): la landing sigue sin osito. */
  onFail?: () => void;
};

class SceneBoundary extends Component<{ onFail?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function OsitoCanvas({ paused = false, onReady, onFail }: Props) {
  return (
    <SceneBoundary onFail={onFail}>
      <OsitoScene paused={paused} onReady={onReady} />
    </SceneBoundary>
  );
}
