function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />
}

export default function RoomDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  )
}
