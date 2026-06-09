'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface Props {
  roomId: string
  hasActiveTenant: boolean
}

export function RoomActions({ roomId, hasActiveTenant }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (error) {
      toast.error('Xóa thất bại: ' + error.message)
      setLoading(false)
      return
    }
    toast.success('Đã xóa phòng')
    router.push('/rooms')
    router.refresh()
  }

  return (
    <div className="pt-2">
      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full gap-2"
        onClick={() => {
          if (hasActiveTenant) {
            toast.error('Không thể xóa phòng đang có người thuê')
            return
          }
          setOpen(true)
        }}
      >
        <Trash2 className="h-4 w-4" />
        Xóa phòng
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa phòng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hành động này không thể hoàn tác. Toàn bộ hóa đơn của phòng cũng sẽ bị xóa.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Đang xóa...' : 'Xóa phòng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
