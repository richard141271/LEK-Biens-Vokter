import AlertsPoller from "./components/AlertsPoller";

export default function MattilsynetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AlertsPoller />
      {children}
    </>
  );
}
