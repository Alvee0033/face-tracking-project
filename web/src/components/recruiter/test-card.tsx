import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Edit, MoreHorizontal, Calendar } from "lucide-react"

export function RecruiterTestCard() {
    return (
        <Card className="glass-card border-border/50 p-6 max-w-md hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            {/* Test Ribbon */}
            <div className="absolute top-3 right-3">
                <Badge variant="destructive" className="animate-pulse">TEST MODE</Badge>
            </div>

            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Senior AI Engineer
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">San Francisco, CA • Remote Hybrid</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Full-time</Badge>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">$150k - $220k</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-foreground">42</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> Applicants
                    </div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-foreground">5</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" /> Days Active
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                    View Applications
                </Button>
                <Button variant="outline" className="px-3">
                    <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" className="px-3">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    )
}
