'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Download, Trash2, Image as ImageIcon, CheckCircle } from 'lucide-react';

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
    { value: 'formal', label: 'Formal Corporate', desc: 'Classic business attire with studio lighting' },
    { value: 'linkedin', label: 'LinkedIn Style', desc: 'Professional networking photo' },
    { value: 'corporate', label: 'Executive', desc: 'High-end corporate executive look' },
    { value: 'casual_professional', label: 'Modern Professional', desc: 'Tech-friendly business casual' }
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

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);
    return interval;
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setGeneratedImage('');
    setShowSuccess(false);
    const progressInterval = simulateProgress();

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/headshots/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            imageBase64: base64Image,
            style: selectedStyle
          })
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate headshot');
        }

        const data = await response.json();
        setProgress(100);
        setGeneratedImage(data.generatedImageUrl);
        setShowSuccess(true);
        
        // Refresh history
        await fetchHistory();
        
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 1000);
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error generating headshot:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate headshot');
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this headshot?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/headshots/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchHistory();
      }
    } catch (error) {
      console.error('Error deleting headshot:', error);
      alert('Failed to delete headshot');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Professional Headshot Generator</h2>
        <p className="text-gray-600">Upload your photo and get a professional headshot powered by Gemini AI</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Your Photo
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="headshot-upload"
            />
            <label htmlFor="headshot-upload" className="cursor-pointer">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="mx-auto max-h-64 rounded-lg" />
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-600">Click to upload image</span>
                  <span className="text-sm text-gray-400 mt-1">PNG, JPG up to 10MB</span>
                </div>
              )}
            </label>
          </div>

          {/* Style Selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Style
            </label>
            <div className="space-y-2">
              {styles.map((style) => (
                <label key={style.value} className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="style"
                    value={style.value}
                    checked={selectedStyle === style.value}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{style.label}</div>
                    <div className="text-sm text-gray-500">{style.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedFile || loading}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5 mr-2" />
                Generate Professional Headshot
              </>
            )}
          </button>

          {/* Progress Bar */}
          {loading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              Headshot generated successfully!
            </div>
          )}
        </div>

        {/* Generated Result */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generated Headshot
          </label>
          <div className="border-2 border-gray-300 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
            {generatedImage ? (
              <div className="w-full">
                <img src={generatedImage} alt="Generated" className="mx-auto max-h-64 rounded-lg" />
                <button
                  onClick={() => handleDownload(generatedImage, 'professional-headshot.png')}
                  className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Headshot
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                <p>Your generated headshot will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Headshot History</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden">
                <img
                  src={item.generated_image_url}
                  alt="Generated headshot"
                  className="w-full h-48 object-cover"
                />
                <div className="p-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700 capitalize">{item.style.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(item.generated_image_url, `headshot-${item.id}.png`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
