// Pantalla del salón: sin barra lateral ni datos de niños, pensada para proyectar o dejar en una tablet.
export default function ScreenLayout({ children }: LayoutProps<"/pantalla">) {
  return <main className="flex min-h-screen flex-1 flex-col bg-white p-4 sm:p-8">{children}</main>;
}
