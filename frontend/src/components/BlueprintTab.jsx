import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Minus, Maximize, Layers, Target, CheckCircle2,
    Clock, AlertCircle, ChevronDown, Filter, FileUp, Loader2, X
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from './Toast';

const BlueprintTab = ({ projectId }) => {
    // --- REAL-TIME STATE ---
    const [blueprintData, setBlueprintData] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTaskHover, setActiveTaskHover] = useState(null); // To highlight pin when hovering over task list
    const [uploading, setUploading] = useState(false);
    const { showToast, ToastComponent } = useToast();

    // Custom Prompt State
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [tempClickData, setTempClickData] = useState(null);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    // 1. Fetch Real Data
    useEffect(() => {
        fetchBlueprintData();
    }, [projectId]);

    const fetchBlueprintData = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/blueprint-tasks`);
            if (response.status === 200) {
                setBlueprintData(response.data.blueprint);
                setTasks(response.data.tasks);
            }
        } catch (error) {
            console.error("Failed to fetch blueprint:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Handle Adding a New Pin (Real-time update)
    const handleImageClick = async (e) => {
        // Prevent pin drop if user was dragging
        if (isDragging || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        // Calculate percentages based on the exact click relative to the scaled image
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Open Custom Prompt instead of browser prompt
        setTempClickData({ xPercent, yPercent });
        setIsPromptOpen(true);
    };

    const submitTaskPrompt = async (e) => {
        e.preventDefault();
        const newTaskTitle = e.target.title.value;
        if (!newTaskTitle || !tempClickData) return;

        setIsPromptOpen(false); // Close Modal immediately

        const newTaskReq = {
            title: newTaskTitle,
            status: "PENDING",
            x: tempClickData.xPercent,
            y: tempClickData.yPercent,
        };

        // Optimistic UI Update with temporary ID
        const tempId = `temp-${Date.now()}`;
        const optimisticTask = {
            ...newTaskReq,
            id: tempId,
            assignee: "Unassigned",
            color: "#f59e0b" // Yellow for pending
        };

        setTasks([optimisticTask, ...tasks]);

        // Send to backend
        try {
            const response = await api.post(`/projects/${projectId}/blueprint-tasks`, newTaskReq);
            if (response.status === 201) {
                // Replace optimistic temp task with the real one from DB
                setTasks(prev => prev.map(t => t.id === tempId ? response.data : t));
            }
        } catch (err) {
            console.error("Failed to create task", err);
            // Rollback optimistic update
            setTasks(prev => prev.filter(t => t.id !== tempId));
            showToast("Failed to create task pin.", "error");
        } finally {
            setTempClickData(null);
        }
    };

    // Helper for Status Badges
    const getStatusBadge = (status) => {
        switch (status) {
            case 'IN PROGRESS': return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium tracking-wider">IN PROGRESS</span>;
            case 'DONE': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium tracking-wider">DONE</span>;
            case 'PENDING': return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium tracking-wider">PENDING</span>;
            default: return null;
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // ONLY allow PDF as per request
        if (file.type !== 'application/pdf') {
            showToast('Please select a PDF file.', 'warning');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('plans', file);

        try {
            await api.post(`/projects/${projectId}/blueprints`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Refresh data
            await fetchBlueprintData();
            showToast("Blueprint uploaded successfully", "success");
        } catch (error) {
            console.error('Failed to upload blueprint:', error);
            showToast('Failed to upload project plan.', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // --- ZOOM & PAN HANDLERS ---
    const handleWheel = (e) => {
        if (!blueprintData) return;
        e.preventDefault();

        const scaleAmount = -e.deltaY * 0.002;
        setScale(prev => Math.min(Math.max(0.5, prev + scaleAmount), 4));
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click pans
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 4));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    if (loading) return <div className="p-8 text-center flex flex-col items-center justify-center gap-4 text-gray-500 h-[400px]">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="font-medium">Loading Blueprint Engine...</p>
    </div>;

    // --- EMPTY STATE RENDERING ---
    if (!blueprintData) return (
        <div className="flex h-[calc(100vh-250px)]">
            {ToastComponent}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-violet-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-violet-100">
                    <FileUp size={40} className="text-violet-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">No Plans Uploaded Yet</h2>
                <p className="text-gray-500 max-w-md mb-8">
                    This project doesn't have an active blueprint. Upload a PDF plan to activate the interactive task pinning engine.
                </p>

                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />

                <button
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="bg-[#1a1d2e] hover:bg-[#252840] text-white px-8 py-3.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {uploading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" /> Processing PDF...
                        </>
                    ) : (
                        <>
                            <Plus size={20} /> Upload PDF Blueprint
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
            {ToastComponent}

            {/* --- LEFT: BLUEPRINT VIEWER --- */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden relative">

                {/* The Canvas Area (With CSS dot pattern for the background) */}
                <div
                    ref={containerRef}
                    className={`flex-1 relative overflow-hidden bg-gray-50 flex items-center justify-center p-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Controls (Floating Top Left) */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                            <button onClick={zoomIn} className="p-2 hover:bg-gray-50 text-gray-600 border-b border-gray-100"><Plus size={18} /></button>
                            <button onClick={zoomOut} className="p-2 hover:bg-gray-50 text-gray-600"><Minus size={18} /></button>
                        </div>
                        <button onClick={resetZoom} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:bg-gray-50 text-gray-600 mt-1" title="Reset View">
                            <Maximize size={18} />
                        </button>
                    </div>

                    {/* The Actual Blueprint Image inside Transform Container */}
                    <div
                        className="relative w-full max-w-4xl shadow-xl border border-gray-300 transition-transform duration-75 ease-out"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transformOrigin: 'center center'
                        }}
                    >
                        {blueprintData.imageUrl && blueprintData.imageUrl.toLowerCase().endsWith('.pdf') ? (
                            <embed
                                ref={imageRef}
                                src={blueprintData.imageUrl}
                                type="application/pdf"
                                className="w-full pointer-events-none"
                                style={{ height: '600px' }}
                            />
                        ) : (
                            <img
                                ref={imageRef}
                                src={blueprintData.imageUrl}
                                alt="Project Blueprint"
                                className="w-full h-auto block pointer-events-none"
                            />
                        )}

                        {/* Event Capture Layer for Pin Dropping */}
                        <div
                            className="absolute inset-0 z-10"
                            onClick={handleImageClick}
                        />

                        {/* Render Pins from Real Data */}
                        {tasks.filter(t => t.x != null && t.y != null).map(task => (
                            <div
                                key={task.id}
                                className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${activeTaskHover === task.id ? 'scale-150 ring-4 ring-white ring-opacity-50 z-30' : 'z-20'}`}
                                style={{
                                    left: `${task.x}%`,
                                    top: `${task.y}%`,
                                    backgroundColor: task.color
                                }}
                                title={task.title}
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom Toolbar */}
                <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 uppercase">Sheet:</span>
                        <button className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 transition">
                            {blueprintData.name} <ChevronDown size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            accept="application/pdf"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="flex items-center gap-2 text-sm font-medium text-violet-500 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition border border-transparent hover:border-violet-100"
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Upload Plan
                        </button>
                        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition border border-gray-200 shadow-sm">
                            <Layers size={16} /> Layers
                        </button>
                    </div>
                </div>
            </div>

            {/* --- RIGHT: ACTIVE TASKS LIST --- */}
            <div className="w-full lg:w-96 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">

                {/* Task List Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                    <h3 className="font-medium text-gray-900">Active Tasks</h3>
                    <span className="text-xs font-medium text-gray-500 uppercase">{tasks.length} PINS</span>
                </div>

                {/* Scrollable Task List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
                            onMouseEnter={() => setActiveTaskHover(task.id)}
                            onMouseLeave={() => setActiveTaskHover(null)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                {getStatusBadge(task.status)}
                                <span className="text-xs font-medium text-gray-400">#{task.id && task.id.substring ? task.id.substring(task.id.length - 4).toUpperCase() : 'NEW'}</span>
                            </div>

                            <h4 className="font-medium text-gray-900 text-sm mb-3">{task.title}</h4>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    {task.assignee === 'Unassigned' ? (
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-500">UN</div>
                                    ) : (
                                        <img src={`https://ui-avatars.com/api/?name=${task.assignee}&background=random`} alt={task.assignee} className="w-6 h-6 rounded-full" />
                                    )}
                                    <span className="text-xs text-gray-600 font-medium">{task.assignee}</span>
                                </div>

                                {/* Target Icon - Grey if no pin, Colored if pinned */}
                                <button className={`p-1 rounded-full transition ${task.x ? 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-300'}`}>
                                    {task.status === 'DONE' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Target size={18} />}
                                </button>
                            </div>
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <div className="text-center p-8 text-gray-500 text-sm">
                            No tasks assigned to this blueprint yet. Click anywhere on the blueprint to drop a pin.
                        </div>
                    )}
                </div>

                {/* Bottom Filter Button */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition border border-gray-200">
                        <Filter size={16} /> Filter View
                    </button>
                </div>

            </div>

            {/* --- CUSTOM PROMPT MODAL --- */}
            {isPromptOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
                            <h3 className="text-lg font-medium text-gray-900">New Task Pin</h3>
                            <button onClick={() => { setIsPromptOpen(false); setTempClickData(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={submitTaskPrompt} className="p-6 bg-gray-50/50">
                            <label className="block text-xs font-medium text-gray-700 mb-2">Task Title</label>
                            <input
                                type="text"
                                name="title"
                                autoFocus
                                required
                                placeholder="e.g. Check wiring on 2nd floor"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm mb-6"
                            />
                            <div className="flex gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={() => { setIsPromptOpen(false); setTempClickData(null); }}
                                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-[#1a1d2e] hover:bg-[#252840] text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlueprintTab;
