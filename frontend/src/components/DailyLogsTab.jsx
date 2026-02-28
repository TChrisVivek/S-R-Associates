import React, { useState, useEffect } from 'react';
import {
    Calendar, Users, Sun, Cloud, CloudRain, FileText,
    Plus, Image as ImageIcon, X, Loader2, UploadCloud
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from './Toast';
import GlobalLoader from './GlobalLoader';
import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';

const DailyLogsTab = ({ projectId }) => {
    const [logData, setLogData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [galleryFiles, setGalleryFiles] = useState([]);
    const { showToast, ToastComponent } = useToast();

    // Auto-calculating date
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });

    useEffect(() => {
        if (isCreateModalOpen) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, [isCreateModalOpen]);

    // 1. Fetch Real Data
    useEffect(() => {
        fetchLogs();
    }, [projectId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/daily-logs`);
            setLogData(response.data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLog = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            const formData = new FormData(e.target);
            const payload = Object.fromEntries(formData.entries());

            if (galleryFiles.length > 0) {
                showToast("Uploading gallery images...", "info");
                payload.gallery = await uploadMultipleToCloudinary(galleryFiles);
            } else {
                payload.gallery = [];
            }

            await api.post(`/projects/${projectId}/daily-logs`, payload);

            await fetchLogs();
            setIsCreateModalOpen(false);
            setGalleryFiles([]);
            showToast("Daily log created successfully", "success");
        } catch (error) {
            console.error("Failed to create log:", error);
            showToast("Failed to create daily log. Please try again.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setGalleryFiles(prev => [...prev, ...files]);
    };

    const removeFile = (indexToRemove) => {
        setGalleryFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // Helper to format date string
    const formatDate = (dateString) => {
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    // Helper for Weather Icon
    const getWeatherIcon = (condition) => {
        if (!condition) return <Sun size={14} className="text-orange-500" />;

        switch (condition.toLowerCase()) {
            case 'sunny': return <Sun size={14} className="text-orange-500" />;
            case 'cloudy': return <Cloud size={14} className="text-gray-500" />;
            case 'rainy': return <CloudRain size={14} className="text-violet-500" />;
            default: return <Sun size={14} className="text-orange-500" />;
        }
    };

    if (loading) return <GlobalLoader />;
    if (!logData) return <div className="p-8 text-center text-red-500">Failed to load logs.</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            {ToastComponent}

            {/* --- HEADER CARD --- */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-medium text-gray-900 mb-1">Project Daily Logs</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Calendar size={14} />
                        <span>{logData.projectPhase}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-violet-500 font-medium uppercase">Last Updated: {logData.lastUpdated}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-[#1a1d2e] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#252840] transition-all shadow-sm">
                        <Plus size={18} /> Create Log
                    </button>
                </div>
            </div>

            {/* --- TIMELINE SECTION --- */}
            <div className="relative pl-4">
                {/* The Vertical Line */}
                <div className="absolute top-0 bottom-0 left-[19px] w-0.5 bg-gray-200"></div>

                <div className="space-y-8">
                    {logData.logs.length === 0 ? (
                        <div className="pl-12 py-8 text-gray-500 font-medium italic">No daily logs recorded yet.</div>
                    ) : (
                        logData.logs.map((log) => (
                            <div key={log.id} className="relative pl-10">

                                {/* Timeline Dot Icon */}
                                <div className="absolute left-0 top-0 bg-[#1a1d2e] text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-gray-50 z-10 shadow-sm">
                                    <Calendar size={18} />
                                </div>

                                {/* LOG CARD */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">

                                    {/* Log Header */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">{formatDate(log.date)}</h3>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">{log.day}</p>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-orange-100">
                                                {getWeatherIcon(log.weather.condition)}
                                                <span>{log.weather.condition}</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-100">
                                                <Users size={14} />
                                                <span>{log.laborers} Laborers</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Notes */}
                                    <div className="mb-6 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            <FileText size={14} /> Progress Notes
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                            {log.notes}
                                        </p>
                                    </div>

                                    {/* Site Gallery */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            <ImageIcon size={14} /> Site Gallery
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                            {log.gallery && log.gallery.map((img, idx) => (
                                                <a key={idx} href={img} target="_blank" rel="noreferrer" className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer block">
                                                    <img src={img} alt="Site work" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                                </a>
                                            ))}
                                            {(!log.gallery || log.gallery.length === 0) && (
                                                <p className="text-sm text-gray-400 italic">No photos attached.</p>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )))}
                </div>
            </div>

            {/* --- CREATE LOG MODAL --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl my-8 overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 flex flex-col border-b border-gray-100 bg-white relative">
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-medium text-gray-900">Create Daily Log</h3>
                            <p className="text-gray-500 text-sm mt-1">Record today's progress, weather, and labor constraints</p>
                        </div>

                        <form onSubmit={handleCreateLog} className="p-8 space-y-6 bg-gray-50/30">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Date</label>
                                    <input type="date" name="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Day</label>
                                    <input type="text" name="day" value={selectedDay} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none shadow-sm text-sm text-gray-500 cursor-not-allowed font-medium" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Weather Condition</label>
                                    <select name="weatherCondition" required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm text-sm">
                                        <option value="Sunny">Sunny</option>
                                        <option value="Cloudy">Cloudy</option>
                                        <option value="Rainy">Rainy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Total Laborers</label>
                                    <input type="number" name="laborers" required placeholder="e.g. 42" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Progress Notes</label>
                                <textarea name="notes" rows="4" required placeholder="Detail the work completed today, any delays, safety checks, or material shortages..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm resize-none"></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Site Gallery (Optional)</label>
                                <div className={`relative border-2 border-dashed ${galleryFiles.length > 0 ? 'border-violet-400 bg-violet-50/50' : 'border-gray-200 hover:border-violet-400 hover:bg-violet-50/50'} rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group overflow-hidden bg-white`}>
                                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className={`w-10 h-10 ${galleryFiles.length > 0 ? 'bg-violet-100' : 'bg-gray-50 group-hover:bg-violet-100'} rounded-full flex items-center justify-center mb-3 transition-colors`}>
                                        <UploadCloud className={`${galleryFiles.length > 0 ? 'text-violet-500' : 'text-gray-400 group-hover:text-violet-500'} transition-colors`} size={20} />
                                    </div>
                                    <p className={`font-medium text-sm ${galleryFiles.length > 0 ? 'text-violet-600' : 'text-gray-700 group-hover:text-violet-600'} transition-colors`}>
                                        {galleryFiles.length > 0 ? `${galleryFiles.length} Photos Staged` : 'Upload Site Photos'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 truncate w-full px-4">
                                        Click or drag multiple images here
                                    </p>
                                </div>

                                {galleryFiles.length > 0 && (
                                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {galleryFiles.map((file, idx) => (
                                            <div key={idx} className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 group bg-gray-100">
                                                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeFile(idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => { setIsCreateModalOpen(false); setGalleryFiles([]); }} className="px-6 py-3.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading} className="px-8 py-3.5 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-md shadow-none transition-all flex items-center gap-2 disabled:opacity-70">
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Save Daily Log"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyLogsTab;
