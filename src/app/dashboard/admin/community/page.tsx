import WarRoomDashboard from '@/components/WarRoomDashboard';

export default function AdminWarRoomPage() {
    return (
        <WarRoomDashboard 
            backLink="/dashboard/admin/founders"
            backText="Tilbake til Gründer-oppfølging"
            title="War Room (Admin)"
        />
    );
}