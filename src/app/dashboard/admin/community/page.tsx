import WarRoomChat from '@/components/WarRoomChat';

export default function AdminWarRoomPage() {
    return (
        <WarRoomChat 
            backLink="/dashboard/admin/founders"
            backText="Tilbake til Gründer-oppfølging"
            title="War Room (Admin)"
        />
    );
}