import React, { useState } from 'react';
import { X, Upload, Home, Building2, Hammer, CheckCircle2, Calendar, Loader2, Plus, FileText, Trash2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import api from '../api/axios';
import { useToast } from './Toast';

const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
    const { showToast, ToastComponent } = useToast();
    const [formData, setFormData] = useState({
        title: '',
        client: '',
        address: '',
        siteSize: '',
        floors: '',
        type: 'Residential', // Default
        budget: '',
        budgetUnit: 'Lakhs', // Default unit
        startDate: null,
        endDate: null,
        manager: '',
        contractor: ''
    });
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Prevent negative numbers for specific fields
        if (['siteSize', 'floors', 'budget'].includes(name) && value !== '') {
            if (parseFloat(value) < 0) return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date, name) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };

    const handleTypeSelect = (type) => {
        setFormData(prev => ({ ...prev, type }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadedFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleSubmit = async () => {
        // Basic validation
        if (!formData.title || formData.title.trim() === '') {
            showToast("Please enter a project name", "error");
            return;
        }

        setIsLoading(true);

        try {
            let imageUrl = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=1000"; // Default
            let uploadedBlueprints = [];

            // 1. Upload Files if exist
            if (uploadedFiles.length > 0) {
                const uploadData = new FormData();
                uploadedFiles.forEach(file => {
                    uploadData.append('plans', file);
                });

                try {
                    const uploadRes = await api.post('/projects/upload', uploadData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (uploadRes.data.files && uploadRes.data.files.length > 0) {
                        // Use the first image as the main project image if available, else default
                        const firstImage = uploadRes.data.files.find(f => f.type.startsWith('image/'));
                        if (firstImage) {
                            imageUrl = firstImage.url;
                        }
                        uploadedBlueprints = uploadRes.data.files;
                    }

                } catch (err) {
                    console.error("Upload failed", err);
                    showToast("File upload failed, but continuing with project creation...", "error");
                }
            }

            // 2. Create Project
            const projectPayload = {
                ...formData,
                image: imageUrl,
                blueprints: uploadedBlueprints,
                // Ensure numeric values are numbers, default to 0 if empty
                siteSize: Number(formData.siteSize) || 0,
                floors: Number(formData.floors) || 0,
                budget: Number(formData.budget) || 0,
                // Ensure dates are valid Date objects or null
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
            };

            const response = await api.post('/projects', projectPayload);

            if (response.status === 201) {
                onCreate(response.data);
                // Show success toast
                showToast("Project created successfully!", "success");
                onClose();
                // Reset form
                setFormData({
                    title: '', client: '', address: '', siteSize: '', floors: '',
                    type: 'Residential', budget: '', budgetUnit: 'Lakhs',
                    startDate: null, endDate: null, manager: '', contractor: ''
                });
                setUploadedFiles([]);
            }

        } catch (error) {
            console.error("Failed to create project:", error);
            if (error.response && error.response.data && error.response.data.message) {
                showToast(error.response.data.message, "error");
            } else {
                showToast("Failed to create project. Please try again.", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function for budget preview (assuming it exists elsewhere or needs to be added)
    const getBudgetPreview = () => {
        if (!formData.budget) return '';
        const budget = parseFloat(formData.budget);
        if (isNaN(budget)) return '';

        let displayValue = budget;
        let unit = formData.budgetUnit;

        if (unit === 'Lakhs') {
            displayValue = budget * 100000;
        } else if (unit === 'Crores') {
            displayValue = budget * 10000000;
        }

        return `Approx. ₹${displayValue.toLocaleString('en-IN')}`;
    };

    // Placeholder for customStyles if it's meant to be defined
    const customStyles = `
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
    `;


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            {ToastComponent}
            <style>{customStyles}</style>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Create New Project</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter the details below to initialize a new construction project.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">

                    {/* Project Identity */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Building2 size={16} /></span>
                            Project Identity
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Project Name</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Skyline Towers Phase 1"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Client Name</label>
                                    <input
                                        type="text"
                                        name="client"
                                        value={formData.client}
                                        onChange={handleChange}
                                        placeholder="e.g. Acme Development Corp"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Site Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="123 Construction Blvd"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Site Size (sq ft)</label>
                                    <input
                                        type="number"
                                        name="siteSize"
                                        value={formData.siteSize}
                                        onChange={handleChange}
                                        min="0"
                                        placeholder="e.g. 5000"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Number of Floors</label>
                                    <input
                                        type="number"
                                        name="floors"
                                        value={formData.floors}
                                        onChange={handleChange}
                                        min="0"
                                        placeholder="e.g. 3"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Project Type */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Hammer size={16} /></span>
                            Project Type
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ProjectTypeCard
                                icon={<Home size={24} />}
                                title="Residential"
                                subtitle="Single & Multi-family"
                                selected={formData.type === 'Residential'}
                                onClick={() => handleTypeSelect('Residential')}
                            />
                            <ProjectTypeCard
                                icon={<Building2 size={24} />}
                                title="Commercial"
                                subtitle="Retail & Office"
                                selected={formData.type === 'Commercial'}
                                onClick={() => handleTypeSelect('Commercial')}
                            />
                            <ProjectTypeCard
                                icon={<Hammer size={24} />}
                                title="Renovation"
                                subtitle="Remodel & Retrofit"
                                selected={formData.type === 'Renovation'}
                                onClick={() => handleTypeSelect('Renovation')}
                            />
                        </div>
                    </section>

                    {/* Budget & Timeline */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Calendar size={16} /></span>
                            Budget & Timeline
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Estimated Budget</label>
                                <div className="relative flex rounded-lg shadow-sm">
                                    <div className="relative flex-grow focus-within:z-10">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">₹</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            min="0"
                                            placeholder="0.00"
                                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-l-md py-2.5 border"
                                        />
                                    </div>
                                    <div className="-ml-px relative">
                                        <select
                                            name="budgetUnit"
                                            value={formData.budgetUnit}
                                            onChange={handleChange}
                                            className="focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-r-md sm:text-sm py-2.5 pl-3 pr-7 border bg-gray-50 text-gray-700"
                                        >
                                            <option>Lakhs</option>
                                            <option>Crores</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.budget && (
                                    <p className="mt-1 text-xs text-blue-600 font-medium">
                                        {getBudgetPreview()}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Start Date</label>
                                <DatePicker
                                    selected={formData.startDate}
                                    onChange={(date) => handleDateChange(date, 'startDate')}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/mm/yyyy"
                                    showYearDropdown
                                    showMonthDropdown
                                    dropdownMode="select"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Completion</label>
                                <DatePicker
                                    selected={formData.endDate}
                                    onChange={(date) => handleDateChange(date, 'endDate')}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/mm/yyyy"
                                    showYearDropdown
                                    showMonthDropdown
                                    dropdownMode="select"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Team Assignment - Visual Only */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><UsersIcon size={16} /></span>
                            Team Assignment
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Site Manager</label>
                                <select
                                    name="manager"
                                    value={formData.manager}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                >
                                    <option value="">Select a manager...</option>
                                    <option value="david">David Miller</option>
                                    <option value="sarah">Sarah Jenkins</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Primary Contractor</label>
                                <select
                                    name="contractor"
                                    value={formData.contractor}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                >
                                    <option value="">Select contractor...</option>
                                    <option value="buildco">BuildCo Inc.</option>
                                    <option value="apex">Apex Construction</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Documents */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Upload size={16} /></span>
                            Documents
                        </h3>

                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => document.getElementById('fileUpload').click()}
                            className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group border-gray-200 hover:bg-gray-50 mb-4"
                        >
                            <input
                                id="fileUpload"
                                type="file"
                                className="hidden"
                                multiple
                                onChange={handleFileChange}
                            />

                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={20} className="text-blue-500" />
                            </div>
                            <p className="text-sm font-bold text-gray-700"><span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-400 mt-1">Blueprints, Permits, Site Plans (PDF, DWG up to 50MB)</p>
                        </div>

                        {/* File List */}
                        {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 line-clamp-1">{file.name}</p>
                                                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-all hover:translate-y-[-1px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        {isLoading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>

            </div>
        </div>
    );
};

// Sub-components
const ProjectTypeCard = ({ icon, title, subtitle, selected, onClick }) => (
    <div
        onClick={onClick}
        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200 hover:shadow-md'}`}
    >
        {selected && <div className="absolute top-3 right-3 text-blue-500"><CheckCircle2 size={18} fill="currentColor" className="text-white" /></div>}

        <div className={`mb-3 ${selected ? 'text-blue-500' : 'text-gray-400'}`}>
            {icon}
        </div>
        <div className="font-bold text-gray-800 text-sm">{title}</div>
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
);

// Helper icon
const UsersIcon = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
);

export default CreateProjectModal;
