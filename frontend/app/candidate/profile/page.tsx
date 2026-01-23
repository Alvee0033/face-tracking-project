"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cvAPI, uploadAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Globe, Edit2, Plus, Loader2, Sparkles, ChevronRight, Camera } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useOptimizedData } from '@/lib/hooks/use-optimized-data'

export default function ProfilePage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(false) // Changed to false for instant display

    // Check cache immediately on mount
    useEffect(() => {
        const cached = localStorage.getItem('candidate_profile_full')
        if (cached) {
            try {
                const cachedData = JSON.parse(cached)
                if (cachedData.data) {
                    setProfile(cachedData.data.profile || cachedData.data)
                }
            } catch (e) {
                console.warn('Cache parse error', e)
            }
        } else {
            setLoading(true) // Only show loading spinner if no cache and fetching
        }
        // Fetch fresh data in background
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await cvAPI.getProfile()
            if (response.data) {
                const profileData = response.data.profile || response.data
                setProfile(profileData)
                // Update cache
                localStorage.setItem('candidate_profile_full', JSON.stringify({
                    data: response.data,
                    timestamp: Date.now()
                }))
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
            // Optionally, handle error display to user
        } finally {
            setLoading(false)
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                bounce: 0.2,
                stiffness: 300,
                damping: 25
            }
        }
    }

    const [uploadingProfilePic, setUploadingProfilePic] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingProfilePic(true)
            const formData = new FormData()
            formData.append('file', file)

            const response = await uploadAPI.uploadProfileImage(formData)

            if (response.data?.success) {
                const newUrl = response.data.url
                // Update Local State
                setProfile((prev: any) => ({ ...prev, avatar_url: newUrl, profile_picture_url: newUrl }))

                // Update Cache (Candidate Full)
                const cached = localStorage.getItem('candidate_profile_full')
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached)
                        const newData = {
                            ...parsed,
                            data: {
                                ...parsed.data,
                                profile: { ...parsed.data.profile, avatar_url: newUrl, profile_picture_url: newUrl }
                            }
                        }
                        localStorage.setItem('candidate_profile_full', JSON.stringify(newData))
                    } catch (e) { console.error(e) }
                }

                // Update User Auth (Sidebars/Global)
                const userCached = localStorage.getItem('user')
                if (userCached) {
                    try {
                        const parsedUser = JSON.parse(userCached)
                        const newUser = { ...parsedUser, profilePicture: newUrl }
                        localStorage.setItem('user', JSON.stringify(newUser))
                        window.dispatchEvent(new Event('storage')) // Notify listeners
                    } catch (e) { console.error(e) }
                }
            }
        } catch (error) {
            console.error('Upload failed', error)
            alert('Failed to upload image')
        } finally {
            setUploadingProfilePic(false)
        }
    }

    // Calculate generic profile strength
    const calculateStrength = () => {
        if (!profile) return 0;
        let score = 20; // Base for existing
        if (profile.work_experience?.length > 0) score += 20;
        if (profile.education?.length > 0) score += 20;
        if (profile.skills?.length > 0) score += 20;
        if (profile.portfolio_url) score += 10;
        if (profile.resume_url) score += 10;
        return Math.min(score, 100);
    }

    const strength = calculateStrength()

    return (
        <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden text-slate-900 font-sans selection:bg-teal-200 selection:text-teal-900">

            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10">

                <main className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">
                    {loading && !profile ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                            <Loader2 className="h-10 w-10 text-teal-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Loading profile...</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-8"
                        >
                            {/* Header / Profile Card */}
                            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-teal-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                                        <Avatar className="h-32 w-32 border-4 border-white shadow-lg relative cursor-pointer">
                                            {uploadingProfilePic && (
                                                <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center rounded-full">
                                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                                </div>
                                            )}
                                            <AvatarImage src={profile?.avatar_url || profile?.profile_picture_url} className="object-cover" />
                                            <AvatarFallback className="bg-teal-100 text-teal-700 text-4xl font-bold">
                                                {profile?.full_name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <label
                                            htmlFor="profile-upload"
                                            className="absolute bottom-0 right-0 rounded-full h-10 w-10 shadow-md border border-white bg-white text-slate-700 hover:text-teal-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors z-10"
                                            title="Upload Photo"
                                        >
                                            <Camera className="h-4 w-4" />
                                        </label>
                                        <input
                                            id="profile-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            disabled={uploadingProfilePic}
                                        />
                                    </div>

                                    <div className="flex-1 w-full">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                            <div>
                                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                                                    {profile?.full_name}
                                                </h1>
                                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                                                    <div className="flex items-center gap-1.5 hover:text-teal-600 transition-colors cursor-default">
                                                        <Briefcase className="h-4 w-4" />
                                                        {profile?.current_role || "Open to work"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 hover:text-teal-600 transition-colors cursor-default">
                                                        <MapPin className="h-4 w-4" />
                                                        {profile?.location || "Remote"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 hover:text-teal-600 transition-colors cursor-default">
                                                        <Mail className="h-4 w-4" />
                                                        {profile?.email}
                                                    </div>
                                                </div>
                                            </div>

                                            <Link href="/candidate/profile/edit">
                                                <Button
                                                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 transition-all"
                                                >
                                                    Edit Profile
                                                </Button>
                                            </Link>
                                        </div>

                                        {/* Strength Bar */}
                                        <div className="bg-white/50 rounded-2xl p-4 border border-teal-50">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                    <Sparkles className="h-3 w-3 text-teal-500" /> Profile Strength
                                                </span>
                                                <span className="text-sm font-black text-teal-600">{strength}%</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${strength}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                                {/* Left Column */}
                                <div className="space-y-8 md:col-span-2">

                                    {/* Experience Section */}
                                    <SectionCard
                                        title="Experience"
                                        icon={Briefcase}
                                        editUrl="/candidate/profile/experience"
                                        isEmpty={!profile?.work_experience?.length}
                                        emptyText="Add your work history to show recruiters your track record."
                                    >
                                        <div className="space-y-6">
                                            {profile?.work_experience?.map((exp: any, i: number) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 text-teal-600 group-hover:scale-105 transition-transform">
                                                        <Briefcase className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">{exp.job_title}</h3>
                                                        <p className="text-sm font-medium text-slate-600">{exp.company_name}</p>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {exp.start_date} - {exp.end_date || "Present"}
                                                        </p>
                                                        {exp.description && (
                                                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{exp.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>

                                    {/* Education Section */}
                                    <SectionCard
                                        title="Education"
                                        icon={GraduationCap}
                                        editUrl="/candidate/profile/education"
                                        isEmpty={!profile?.education?.length}
                                        emptyText="Share your educational background."
                                    >
                                        <div className="space-y-6">
                                            {profile?.education?.map((edu: any, i: number) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 group-hover:scale-105 transition-transform">
                                                        <GraduationCap className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">{edu.degree}</h3>
                                                        <p className="text-sm font-medium text-slate-600">{edu.school}</p>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {edu.start_year} - {edu.end_year || "Present"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>

                                </div>

                                {/* Right Column */}
                                <div className="space-y-8">

                                    {/* Skills */}
                                    <SectionCard
                                        title="Skills"
                                        icon={Code}
                                        editUrl="/candidate/profile/skills"
                                        isEmpty={!profile?.skills?.length}
                                        emptyText="Add skills to get matched with jobs."
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {profile?.skills?.map((skill: any, i: number) => (
                                                <motion.span
                                                    key={i}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="px-4 py-2 bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200 rounded-xl text-sm font-semibold text-teal-700 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-default"
                                                >
                                                    {skill.name || skill}
                                                </motion.span>
                                            ))}
                                        </div>
                                    </SectionCard>

                                    {/* Contact / Links */}
                                    <SectionCard title="Additional Info" icon={Globe} editUrl="/candidate/profile/edit">
                                        <div className="space-y-4">
                                            {profile?.portfolio_url && (
                                                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                                                        <Globe className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-600 group-hover:text-teal-600">Portfolio</span>
                                                    <ChevronRight className="h-4 w-4 ml-auto text-slate-300" />
                                                </a>
                                            )}

                                            {profile?.linkedin_url && (
                                                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                                        <span className="font-bold text-xs">in</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-600 group-hover:text-teal-600">LinkedIn</span>
                                                    <ChevronRight className="h-4 w-4 ml-auto text-slate-300" />
                                                </a>
                                            )}
                                        </div>
                                    </SectionCard>

                                </div>
                            </div>

                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    )
}

function SectionCard({ title, icon: Icon, children, editUrl, isEmpty, emptyText }: any) {
    const router = useRouter()

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-gradient-to-br from-white via-white to-teal-50/20 backdrop-blur-xl border border-teal-100/40 rounded-3xl p-7 shadow-md hover:shadow-xl transition-all group"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-teal-500" />
                    {title}
                </h2>
                <Link href={editUrl}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-teal-50 text-slate-400 hover:text-teal-600"
                    >
                        {isEmpty ? <Plus className="h-5 w-5" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                </Link>
            </div>

            {isEmpty ? (
                <Link href={editUrl} className="block w-full">
                    <div className="text-center py-6 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 cursor-pointer hover:bg-teal-50/30 hover:border-teal-200 transition-all">
                        <p className="text-sm text-slate-500 font-medium">{emptyText}</p>
                        <Button variant="link" className="text-teal-600 h-auto p-0 mt-2 font-bold">Add {title}</Button>
                    </div>
                </Link>
            ) : (
                children
            )}
        </motion.div>
    )
}
