import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Minus, Maximize, Layers, Target, CheckCircle2,
    Clock, AlertCircle, ChevronDown, FileUp, Loader2, X,
    ChevronLeft, ChevronRight, FileText, Trash2
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/axios';
import { useToast } from './Toast';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BlueprintTab = ({ projectId }) => {
    // --- REAL-TIME STATE ---
    const [allBlueprints, setAllBlueprints] = useState([]);
    const [activeBlueprintIndex, setActiveBlueprintIndex] = useState(0);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTaskHover, setActiveTaskHover] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isSheetSelectorOpen, setIsSheetSelectorOpen] = useState(false);
    const { showToast, ToastComponent } = useToast();

    // Custom Prompt State
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [tempClickData, setTempClickData] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const sheetSelectorRef = useRef(null);
    const canvasContainerRef = useRef(null);

    // PDF rendering state
    const [pdfPageLoading, setPdfPageLoading] = useState(false);
    const [containerWidth, setContainerWidth] = useState(800);

    // Current active blueprint
    const blueprintData = allBlueprints.length > 0 ? allBlueprints[activeBlueprintIndex] : null;

    // Close sheet selector on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sheetSelectorRef.current && !sheetSelectorRef.current.contains(e.target)) {
                setIsSheetSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Track container width for PDF rendering
    useEffect(() => {
        const updateWidth = () => {
            if (canvasContainerRef.current) {
                setContainerWidth(canvasContainerRef.current.offsetWidth - 64);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [loading]);

    // 1. Fetch Real Data
    useEffect(() => {
        fetchBlueprintData();
    }, [projectId]);

    const fetchBlueprintData = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/blueprint-tasks`);
            if (response.status === 200) {
                const blueprints = response.data.blueprints || [];
                setAllBlueprints(blueprints);
                // Default to the latest uploaded sheet
                if (blueprints.length > 0) {
                    setActiveBlueprintIndex(blueprints.length - 1);
                }
                setTasks(response.data.tasks);
            }
        } catch (error) {
            console.error("Failed to fetch blueprint:", error);
        } finally {
            setLoading(false);
        }
    };

    // Switch sheet
    const switchSheet = (index) => {
        setActiveBlueprintIndex(index);
        setIsSheetSelectorOpen(false);
        // Reset zoom/pan when switching
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // Navigate sheets with arrows
    const prevSheet = () => {
        if (activeBlueprintIndex > 0) switchSheet(activeBlueprintIndex - 1);
    };
    const nextSheet = () => {
        if (activeBlueprintIndex < allBlueprints.length - 1) switchSheet(activeBlueprintIndex + 1);
    };

    // 2. Handle Adding a New Pin (Real-time update)
    const handleImageClick = async (e) => {
        if (isDragging || !imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        setTempClickData({ xPercent, yPercent });
        setIsPromptOpen(true);
    };

    const submitTaskPrompt = async (e) => {
        e.preventDefault();
        const newTaskTitle = e.target.title.value;
        if (!newTaskTitle || !tempClickData) return;

        setIsPromptOpen(false);

        const newTaskReq = {
            title: newTaskTitle,
            status: "PENDING",
            x: tempClickData.xPercent,
            y: tempClickData.yPercent,
        };

        const tempId = `temp-${Date.now()}`;
        const optimisticTask = {
            ...newTaskReq,
            id: tempId,
            assignee: "Unassigned",
            color: "#f59e0b"
        };

        setTasks([optimisticTask, ...tasks]);

        try {
            const response = await api.post(`/projects/${projectId}/blueprint-tasks`, newTaskReq);
            if (response.status === 201) {
                setTasks(prev => prev.map(t => t.id === tempId ? response.data : t));
            }
        } catch (err) {
            console.error("Failed to create task", err);
            setTasks(prev => prev.filter(t => t.id !== tempId));
            showToast("Failed to create task pin.", "error");
        } finally {
            setTempClickData(null);
        }
    };

    const handleDeleteTask = (taskId, e) => {
        if (e) e.stopPropagation();
        setTaskToDelete(taskId);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;

        try {
            await api.delete(`/projects/${projectId}/blueprint-tasks/${taskToDelete}`);
            setTasks(prev => prev.filter(t => t.id !== taskToDelete));
            showToast("Pin deleted successfully", "success");
        } catch (error) {
            console.error("Failed to delete pin:", error);
            showToast("Failed to delete pin. Please try again.", "error");
        } finally {
            setTaskToDelete(null);
        }
    };

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
        if (e.button !== 0) return;
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
    if (allBlueprints.length === 0) return (
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
        <div className="flex flex-col gap-4 h-[calc(100vh-250px)]">
            {ToastComponent}

            {/* --- TOP: SHEET NAVIGATION BAR --- */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevSheet}
                            disabled={activeBlueprintIndex === 0}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:text-gray-200 disabled:hover:bg-transparent transition"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={nextSheet}
                            disabled={activeBlueprintIndex === allBlueprints.length - 1}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:text-gray-200 disabled:hover:bg-transparent transition"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Sheet Selector Dropdown */}
                    <div className="relative" ref={sheetSelectorRef}>
                        <button
                            onClick={() => setIsSheetSelectorOpen(!isSheetSelectorOpen)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition min-w-0"
                        >
                            <FileText size={14} className="text-violet-500 shrink-0" />
                            <span className="truncate max-w-[300px]">{blueprintData?.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                                {activeBlueprintIndex + 1}/{allBlueprints.length}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isSheetSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {isSheetSelectorOpen && (
                            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[320px] max-h-[300px] overflow-y-auto py-1">
                                {allBlueprints.map((bp, index) => (
                                    <button
                                        key={bp.id}
                                        onClick={() => switchSheet(index)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition ${index === activeBlueprintIndex ? 'bg-violet-50' : ''}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${index === activeBlueprintIndex ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-medium truncate ${index === activeBlueprintIndex ? 'text-violet-700' : 'text-gray-800'}`}>
                                                {bp.name}
                                            </p>
                                            {bp.uploadedAt && (
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    Uploaded {new Date(bp.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                        {index === activeBlueprintIndex && (
                                            <span className="text-[10px] text-violet-500 font-semibold uppercase shrink-0">Active</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
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
                        className="flex items-center gap-2 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] px-4 py-2 rounded-lg transition shadow-sm disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {uploading ? 'Processing...' : 'Upload Sheet'}
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT: BLUEPRINT + TASKS --- */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

                {/* --- LEFT: BLUEPRINT VIEWER --- */}
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden relative">

                    {/* The Canvas Area */}
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

                        {/* Scale indicator */}
                        <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-medium text-gray-500">
                            {Math.round(scale * 100)}%
                        </div>

                        {/* The Actual Blueprint Rendered as Clean Image */}
                        <div
                            ref={canvasContainerRef}
                            className="relative w-full max-w-4xl shadow-xl border border-gray-300 transition-transform duration-75 ease-out bg-white"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                transformOrigin: 'center center'
                            }}
                        >
                            {blueprintData.imageUrl && blueprintData.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                <div className="relative">
                                    {pdfPageLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                            <Loader2 className="animate-spin text-violet-500" size={28} />
                                        </div>
                                    )}
                                    <Document
                                        file={blueprintData.imageUrl}
                                        loading={null}
                                        onLoadError={(err) => console.error('PDF load error:', err)}
                                    >
                                        <Page
                                            pageNumber={1}
                                            width={Math.min(containerWidth, 900)}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            onRenderSuccess={() => setPdfPageLoading(false)}
                                            onLoadStart={() => setPdfPageLoading(true)}
                                            loading={null}
                                            className="pointer-events-none"
                                        />
                                    </Document>
                                </div>
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

                            {/* Render Pins */}
                            {tasks.filter(t => t.x != null && t.y != null).map(task => (
                                <div
                                    key={task.id}
                                    className={`absolute w-7 h-7 flex items-center justify-center rounded-full border-[3px] border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${activeTaskHover === task.id ? 'scale-150 ring-4 ring-white ring-opacity-50 z-30' : 'z-20 hover:scale-125 hover:z-30 cursor-pointer'}`}
                                    style={{
                                        left: `${task.x}%`,
                                        top: `${task.y}%`,
                                        backgroundColor: task.color
                                    }}
                                    title={task.title}
                                    onMouseEnter={() => setActiveTaskHover(task.id)}
                                    onMouseLeave={() => setActiveTaskHover(null)}
                                >
                                    <div className="w-2.5 h-2.5 bg-white rounded-full opacity-80" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: ACTIVE TASKS LIST --- */}
                <div className="w-full lg:w-80 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">

                    {/* Task List Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                        <h3 className="font-medium text-gray-900 text-sm">Active Tasks</h3>
                        <span className="text-[10px] font-semibold text-violet-500 bg-violet-50 px-2 py-1 rounded-md">{tasks.length} PINS</span>
                    </div>

                    {/* Scrollable Task List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                className={`bg-white border rounded-xl p-3.5 transition cursor-pointer ${activeTaskHover === task.id ? 'border-violet-300 shadow-md shadow-violet-100/50' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}`}
                                onMouseEnter={() => setActiveTaskHover(task.id)}
                                onMouseLeave={() => setActiveTaskHover(null)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    {getStatusBadge(task.status)}
                                    <span className="text-[10px] font-mono text-gray-300">#{task.id && task.id.substring ? task.id.substring(task.id.length - 4).toUpperCase() : 'NEW'}</span>
                                </div>

                                <h4 className="font-medium text-gray-900 text-sm mb-2.5 leading-snug">{task.title}</h4>

                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {task.assignee === 'Unassigned' ? (
                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-500">UN</div>
                                        ) : (
                                            <img src={`https://ui-avatars.com/api/?name=${task.assignee}&background=random`} alt={task.assignee} className="w-5 h-5 rounded-full" />
                                        )}
                                        <span className="text-[11px] text-gray-500">{task.assignee}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button className={`p-1 rounded-full transition ${task.x ? 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-300'}`}>
                                            {task.status === 'DONE' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Target size={16} />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteTask(task.id, e)}
                                            className="p-1 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                                            title="Delete Pin"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center p-8 text-gray-400 text-sm">
                                <Target size={24} className="mx-auto mb-3 text-gray-300" />
                                <p className="font-medium text-gray-500 mb-1">No tasks yet</p>
                                <p className="text-xs">Click anywhere on the blueprint to drop a pin.</p>
                            </div>
                        )}
                    </div>

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

            {/* --- CONFIRM DELETE MODAL --- */}
            {taskToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Pin?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to permanently delete this task pin? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setTaskToDelete(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteTask}
                                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlueprintTab;
