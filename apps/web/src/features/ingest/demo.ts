// Modo demo: permite que un teléfono haga de juguete y de caja (página /demo) sin hardware.
// Se activa con DEMO_MODE=true en el servidor. En producción real debe estar apagado.
export const DEMO_TOY_ID = "tuli-toy-demo";
export const DEMO_BOX_ID = "tuli-box-demo";

export function demoEnabled() {
  return process.env.DEMO_MODE === "true";
}
