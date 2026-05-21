import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 bg-slate-900 overflow-auto">{children}</main>
    </div>
  );
}
