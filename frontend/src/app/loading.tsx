export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Đang tải">
      <div className="h-6 w-48 bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-3 border border-stone-200 bg-white p-4">
            <div className="aspect-square bg-stone-200" />
            <div className="h-4 w-3/4 bg-stone-200" />
            <div className="h-4 w-1/2 bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
