import BirthdayWishPopup from '@/components/BirthdayWishPopup'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <BirthdayWishPopup />
    </>
  )
}
