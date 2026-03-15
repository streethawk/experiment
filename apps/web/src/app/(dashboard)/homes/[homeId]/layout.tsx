import { Sidebar } from '../../../../components/sidebar';

export default function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { homeId: string };
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar homeId={params.homeId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
