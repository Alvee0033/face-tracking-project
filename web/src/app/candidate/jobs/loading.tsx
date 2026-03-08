export default function JobsLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar space */}
            <div className="h-20" />

            <main className="container mx-auto px-4 py-6 lg:py-8">
                <div className="flex gap-6">
                    {/* Sidebar skeleton */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
                            <div className="h-8 bg-gray-200 rounded animate-pulse" />
                            <div className="h-10 bg-gray-200 rounded animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
                                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                                <div className="h-6 bg-gray-200 rounded animate-pulse w-5/6" />
                            </div>
                        </div>
                    </aside>

                    {/* Main content skeleton */}
                    <div className="flex-1">
                        {/* Header skeleton */}
                        <div className="mb-6 space-y-3">
                            <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
                            <div className="flex gap-3">
                                <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
                                <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
                            </div>
                        </div>

                        {/* Job cards skeleton */}
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-6 bg-gray-200 rounded w-2/3" />
                                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                                            <div className="h-4 bg-gray-200 rounded w-full" />
                                            <div className="flex gap-2">
                                                <div className="h-6 bg-gray-200 rounded w-20" />
                                                <div className="h-6 bg-gray-200 rounded w-20" />
                                                <div className="h-6 bg-gray-200 rounded w-24" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
