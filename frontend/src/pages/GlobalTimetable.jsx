import GlobalTimetablePreview from '@/components/GlobalTimetablePreview';

export default function GlobalTimetable() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1">
        <GlobalTimetablePreview />
      </main>
    </div>
  );
}
