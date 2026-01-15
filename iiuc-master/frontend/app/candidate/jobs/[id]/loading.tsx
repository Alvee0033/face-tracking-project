
import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Elements matching dashboard theme */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s' }} />

            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-white border border-teal-100 shadow-xl flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-emerald-500 rounded-full border-2 border-white animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Loading Job Details...</h3>
                    <p className="text-slate-500 animate-pulse">Fetching the latest opportunity for you</p>
                </div>
            </div>
        </div>
    )
}
