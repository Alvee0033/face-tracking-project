'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Download, Trash2, Image as ImageIcon, CheckCircle, Smartphone, User, Briefcase, Camera, Scan, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface HeadshotHistory {
  id: string;
  original_image_url: string;
  generated_image_url: string;
  style: string;
  created_at: string;
  prompt: string;
}

export default function HeadshotGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('formal');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<HeadshotHistory[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const styles = [
    {
      value: 'formal',
      label: 'Formal',
      desc: 'Classic',
      icon: <Briefcase className="w-4 h-4" />,
      color: 'from-teal-700 to-teal-900'
    },
    {
      value: 'linkedin',
      label: 'LinkedIn',
      desc: 'Professional',
      icon: <User className="w-4 h-4" />,
      color: 'from-emerald-600 to-emerald-800'
    },
    {
      value: 'corporate',
      label: 'Executive',
      desc: 'Corporate',
      icon: <Smartphone className="w-4 h-4" />,
      color: 'from-cyan-700 to-black'
    },
    {
      value: 'casual_professional',
      label: 'Casual',
      desc: 'Modern',
      icon: <Camera className="w-4 h-4" />,
      color: 'from-teal-500 to-cyan-500'
    }
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/headshots/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setGeneratedImage('');
      setShowSuccess(false);
    }
  };

  const getRandomDelay = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  };

  const simulateProgress = (duration: number) => {
    setProgress(0);
    const intervalTime = 100;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const percentage = Math.min((currentStep / steps) * 100, 99);
      setProgress(Math.round(percentage));

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, intervalTime);
    return interval;
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setGeneratedImage('');
    setShowSuccess(false);

    // DEMO MODE: Random delay between 9 and 12 seconds
    const delay = getRandomDelay(9, 12);

    const progressInterval = simulateProgress(delay);

    try {
      // Wait for the random delay
      await new Promise(resolve => setTimeout(resolve, delay));

      clearInterval(progressInterval);
      setProgress(100);

      // DEMO MODE: Always return the specific demo image
      const demoImageUrl = '/demo-headshot.jpg';
      setGeneratedImage(demoImageUrl);
      setShowSuccess(true);

      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Error generating headshot:', error);
      alert('Failed to generate headshot');
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this headshot?')) return;
    alert('This is a demo item.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto mb-10 px-4"
    >
      {/* Main Container - Compact */}
      <div className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-xl p-6 mb-8">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            AI Headshot Generator
          </h2>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-stretch">

          {/* Left Column: Controls */}
          <div className="flex flex-col space-y-6">
            {/* Upload Area */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                1. Upload Source
              </label>
              <div
                className={`
                  relative group border border-dashed rounded-xl p-1 transition-all duration-300
                  ${previewUrl ? 'border-teal-500 bg-teal-50/20' : 'border-gray-300 hover:border-teal-400 hover:bg-white/50 h-auto'}
                `}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="headshot-upload"
                />
                <label htmlFor="headshot-upload" className="cursor-pointer block w-full h-full relative overflow-hidden rounded-lg">
                  {previewUrl ? (
                    <div className="w-full relative flex justify-center py-2 h-auto">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-auto h-auto max-h-[200px] max-w-[60%] object-contain rounded-lg shadow-sm"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <div className="bg-white/90 p-2 rounded-full shadow-sm">
                          <Upload className="w-4 h-4 text-gray-700" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-gray-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Select Image</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Style Selection */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                2. Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {styles.map((style) => (
                  <div
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={`
                      cursor-pointer rounded-lg border p-3 transition-all duration-200
                      ${selectedStyle === style.value
                        ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`
                        p-1.5 rounded-md bg-gradient-to-br ${style.color} text-white
                      `}>
                        {style.icon}
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${selectedStyle === style.value ? 'text-teal-900' : 'text-gray-700'}`}>
                          {style.label}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={!selectedFile || loading}
                className={`
                    w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all
                    ${!selectedFile || loading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-teal-500/20 active:scale-[0.98]'}
                `}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Wand2 className="w-4 h-4 mr-2" /> Generate Headshot
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-100/50 overflow-hidden relative min-h-[400px]">

            {/* Loading Overlay */}
            <AnimatePresence>
              {loading && previewUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]"
                >
                  {/* Background Image ghost */}
                  <div className="absolute inset-0 opacity-20 bg-center bg-cover filter saturate-0 blur-sm" style={{ backgroundImage: `url(${previewUrl})` }}></div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative w-20 h-20 mb-4 rounded-xl overflow-hidden border-2 border-teal-500/30">
                      <img src={previewUrl} className="w-full h-full object-cover opacity-60" />
                      <motion.div
                        className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-teal-500/50 to-transparent box-content border-b-2 border-teal-400"
                        animate={{ top: ["-50%", "100%"] }}
                        transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                      />
                    </div>

                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white mb-1">
                        Generating...
                      </h3>
                      {/* Percentage removed as requested */}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Display */}
            <div className="flex-grow flex items-center justify-center p-4">
              {generatedImage ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full relative group"
                >
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-contain rounded-lg shadow-sm"
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(generatedImage, 'headshot.png')}
                      className="bg-white/90 backdrop-blur text-gray-800 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center hover:bg-white"
                    >
                      <Download className="w-3 h-3 mr-1.5" /> Save Image
                    </button>
                  </div>
                </motion.div>
              ) : !loading && (
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
                    <User className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium">Headshot Preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Ribbon - Compact */}
      {history.length > 0 && (
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {history.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-shrink-0 w-24 h-32 relative rounded-lg overflow-hidden border border-gray-200 group cursor-pointer"
              onClick={() => handleDownload(item.generated_image_url, `headshot-${item.id}.png`)}
            >
              <img
                src={item.generated_image_url}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Download className="w-5 h-5 text-white" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
