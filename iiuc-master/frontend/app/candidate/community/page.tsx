"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users, Briefcase, MessageCircle, Heart, Share2, MoreHorizontal,
    Image as ImageIcon, Smile, Send, Coffee, Award, Sparkles,
    TrendingUp, Search, Bell, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { communityAPI } from "@/lib/api"
import { toast } from "sonner" // Assuming sonner or use-toast is available, simplified alert if not

export default function CommunityPage() {
    const [activeTab, setActiveTab] = useState("official")
    const [posts, setPosts] = useState<any[]>([])
    const [newPostContent, setNewPostContent] = useState("")
    const [isPosting, setIsPosting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const userStr = localStorage.getItem("user")
        if (userStr) {
            try { setUser(JSON.parse(userStr)) } catch { }
        }
    }, [])

    useEffect(() => {
        fetchPosts()
    }, [activeTab])

    const fetchPosts = async () => {
        try {
            setLoading(true)
            const response = await communityAPI.getPosts(activeTab)
            if (response.data?.success) {
                setPosts(response.data.data.posts)
            }
        } catch (error) {
            console.error("Failed to fetch posts:", error)
        } finally {
            setLoading(false)
        }
    }

    const handlePost = async () => {
        if (!newPostContent.trim()) return

        try {
            setIsPosting(true)
            const response = await communityAPI.createPost(newPostContent, activeTab)
            if (response.data?.success) {
                // Add new post to top
                setPosts([response.data.data, ...posts])
                setNewPostContent("")
            }
        } catch (error) {
            console.error("Failed to create post:", error)
            // alert("Failed to post. Please try again.")
        } finally {
            setIsPosting(false)
        }
    }

    const handleLike = async (postId: string) => {
        // Optimistic UI update
        setPosts(currentPosts => currentPosts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    isLiked: !post.isLiked,
                    likes: post.isLiked ? post.likes - 1 : post.likes + 1
                }
            }
            return post
        }))

        try {
            const response = await communityAPI.toggleLike(postId)
            if (!response.data?.success) {
                // Revert on failure
                fetchPosts()
            }
        } catch (error) {
            console.error("Failed to toggle like:", error)
            fetchPosts()
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return "Just now"
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return `${days}d ago`
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Sidebar: Profile & Navigation */}
                    <div className="hidden lg:block lg:col-span-3 space-y-6">
                        <Card className="p-6 border-0 shadow-lg bg-white overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-500 to-emerald-600" />
                            <div className="relative pt-12 flex flex-col items-center">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                                    <AvatarImage src={user?.profilePicture} className="object-cover" />
                                    <AvatarFallback className="bg-teal-100 text-teal-700 text-2xl font-bold">
                                        {user?.fullName?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <h2 className="mt-4 text-xl font-bold text-gray-900">{user?.fullName || "User"}</h2>
                                <p className="text-sm text-gray-500">{user?.role === 'candidate' ? 'Full Stack Developer' : 'Member'}</p>

                                <div className="mt-6 w-full space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Profile Views</span>
                                        <span className="font-bold text-teal-600">1,245</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Post Impressions</span>
                                        <span className="font-bold text-teal-600">8.5k</span>
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                <Link href="/candidate/profile" className="w-full">
                                    <Button variant="outline" className="w-full border-teal-100 hover:bg-teal-50 text-teal-700">View Profile</Button>
                                </Link>
                            </div>
                        </Card>

                        <Card className="p-4 border-0 shadow-md bg-white">
                            <h3 className="font-bold text-gray-700 mb-4 px-2">Community</h3>
                            <nav className="space-y-1">
                                <Button variant="ghost" className="w-full justify-start text-teal-600 bg-teal-50">
                                    <Users className="mr-2 h-4 w-4" /> Feed
                                </Button>
                                <Link href="/candidate/inbox">
                                    <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-teal-600 hover:bg-teal-50">
                                        <MessageCircle className="mr-2 h-4 w-4" /> Messages
                                    </Button>
                                </Link>
                                <Link href="/candidate/jobs">
                                    <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-teal-600 hover:bg-teal-50">
                                        <Briefcase className="mr-2 h-4 w-4" /> Jobs
                                    </Button>
                                </Link>
                            </nav>
                        </Card>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-6 space-y-6">

                        {/* Feed Toggle */}
                        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex">
                            <button
                                onClick={() => setActiveTab("official")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium ${activeTab === "official"
                                    ? "bg-teal-50 text-teal-700 shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <Briefcase className="h-4 w-4" />
                                Official
                            </button>
                            <button
                                onClick={() => setActiveTab("casual")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium ${activeTab === "casual"
                                    ? "bg-purple-50 text-purple-700 shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <Coffee className="h-4 w-4" />
                                Casual
                            </button>
                        </div>

                        {/* Create Post */}
                        <Card className="p-4 border-0 shadow-md">
                            <div className="flex gap-4">
                                <Avatar>
                                    <AvatarImage src={user?.profilePicture} />
                                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                                        {user?.fullName?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-4">
                                    <div className="relative">
                                        <Textarea
                                            placeholder={activeTab === 'official' ? "Share a professional update..." : "What's on your mind? (Casual)"}
                                            className="resize-none border-0 bg-gray-50 focus-visible:ring-0 min-h-[80px]"
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-teal-600">
                                                <ImageIcon className="h-5 w-5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-teal-600">
                                                <Smile className="h-5 w-5" />
                                            </Button>
                                        </div>
                                        <Button
                                            onClick={handlePost}
                                            disabled={!newPostContent.trim() || isPosting}
                                            className={`${activeTab === 'official' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-full px-6 transition-all`}
                                        >
                                            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Post <Send className="ml-2 h-4 w-4" /></>}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Posts Feed */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-teal-500 animate-spin mb-4" />
                                    <p className="text-gray-500">Loading community posts...</p>
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                    <p className="text-gray-500">No posts yet. Be the first to share!</p>
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {posts.map((post) => (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            layout
                                        >
                                            <Card className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex gap-3">
                                                            <Avatar className="cursor-pointer">
                                                                <AvatarImage src={post.author.avatar} />
                                                                <AvatarFallback className={`text-white ${post.type === 'official' ? 'bg-teal-500' : 'bg-purple-500'}`}>
                                                                    {post.author.name?.[0] || "?"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 cursor-pointer hover:underline">{post.author.name}</h4>
                                                                <p className="text-xs text-gray-500">{post.author.role}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{formatTime(post.time)}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="text-gray-400">
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </Button>
                                                    </div>

                                                    <div className="mt-4 mb-4">
                                                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                                    </div>

                                                    {post.image && (
                                                        <div className="mb-4 rounded-xl overflow-hidden">
                                                            <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Badge variant="secondary" className={`${post.type === 'official' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'} capitalize`}>
                                                            {post.type}
                                                        </Badge>
                                                        {post.likes > 0 && (
                                                            <>
                                                                <div className="flex -space-x-2">
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px]">👍</div>
                                                                    <div className="w-6 h-6 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-[10px]">❤️</div>
                                                                </div>
                                                                <span className="text-xs text-gray-500">{post.likes} likes</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    <Separator />

                                                    <div className="flex justify-between items-center mt-2 pt-2">
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => handleLike(post.id)}
                                                            className={`flex-1 hover:bg-teal-50 ${post.isLiked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-teal-600'}`}
                                                        >
                                                            <Heart className={`mr-2 h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                                                            {post.isLiked ? 'Liked' : 'Like'}
                                                        </Button>
                                                        <Button variant="ghost" className="flex-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50">
                                                            <MessageCircle className="mr-2 h-4 w-4" /> Comment ({post.comments})
                                                        </Button>
                                                        <Button variant="ghost" className="flex-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50">
                                                            <Share2 className="mr-2 h-4 w-4" /> Share
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar: Suggestions */}
                    <div className="hidden lg:block lg:col-span-3 space-y-6">
                        <Card className="p-5 border-0 shadow-md bg-white">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-teal-500" /> Trending
                            </h3>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="group cursor-pointer">
                                        <p className="text-xs text-gray-500 font-medium">Programming • Trending</p>
                                        <p className="text-sm font-bold text-gray-800 group-hover:text-teal-600 transition-colors">
                                            #WebDevelopment2026
                                        </p>
                                        <p className="text-xs text-gray-400">12.5k posts</p>
                                    </div>
                                ))}
                            </div>
                            <Button variant="link" className="text-teal-600 px-0 mt-2 text-sm">View all</Button>
                        </Card>

                        <Card className="p-5 border-0 shadow-md bg-white">
                            <h3 className="font-bold text-gray-900 mb-4">People you may know</h3>
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-gray-100 text-gray-600">MK</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 truncate">Michael Knight</h4>
                                            <p className="text-xs text-gray-500 truncate">Software Engineer at Tech</p>
                                        </div>
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-teal-100 hover:bg-teal-50">
                                            <Users className="h-4 w-4 text-teal-600" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
