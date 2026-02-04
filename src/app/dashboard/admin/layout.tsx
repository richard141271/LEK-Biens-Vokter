import AdminNav from '@/components/AdminNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNav />
      <div className="md:pl-64 min-h-screen bg-gray-50">
        {children}
      </div>
    </>
  );
}
