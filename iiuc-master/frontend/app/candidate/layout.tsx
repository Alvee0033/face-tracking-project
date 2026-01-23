import { CommonNavbar } from "@/components/common-navbar"
import { ToastContainer } from "@/components/toast-container"

export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <CommonNavbar />
            <div className="min-h-screen">
                {children}
            </div>
            <ToastContainer />
        </>
    )
}
