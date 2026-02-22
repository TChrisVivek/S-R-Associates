import React from 'react';
import { X, Building2, MapPin, Calendar, CreditCard, FileText, Download } from 'lucide-react';

const ProjectDetailsModal = ({ isOpen, onClose, project }) => {
    if (!isOpen || !project) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "TBD";
        return new Date(dateString).toLocaleDateString('en-GB'); // dd/mm/yyyyish
    };

    const formatBudget = (val, unit) => {
        if (!val) return "0";
        let fullValue = 0;
        if (unit === 'Lakhs') fullValue = val * 100000;
        else if (unit === 'Crores') fullValue = val * 10000000;
        else fullValue = val;

        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(fullValue);
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            'Planning': 'bg-blue-100 text-blue-700',
            'In Progress': 'bg-yellow-100 text-yellow-700',
            'On Track': 'bg-green-100 text-green-700',
            'Delayed': 'bg-red-100 text-red-700',
            'Completed': 'bg-gray-100 text-gray-700'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Header with Image */}
                <div className="relative h-48 sm:h-64 bg-gray-100">
                    <img
                        src={project.image || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5"}
                        alt={project.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute bottom-6 left-6 text-white">
                        <StatusBadge status={project.status} />
                        <h2 className="text-3xl font-bold mt-2 shadow-sm">{project.title}</h2>
                        <div className="flex items-center gap-2 text-gray-200 mt-1">
                            <MapPin size={16} />
                            <p className="text-sm font-medium">{project.address}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto">

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <Building2 size={14} /> Site Size
                            </div>
                            <div className="text-lg font-bold text-gray-900">{project.siteSize} sqft</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <Building2 size={14} /> Floors
                            </div>
                            <div className="text-lg font-bold text-gray-900">{project.floors}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <CreditCard size={14} /> Budget
                            </div>
                            <div className="text-lg font-bold text-gray-900">{formatBudget(project.budget, project.budgetUnit)}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <Calendar size={14} /> Completion
                            </div>
                            <div className="text-lg font-bold text-gray-900">{formatDate(project.endDate)}</div>
                        </div>
                    </div>

                    {/* Team & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                Project Details
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500">Client</span>
                                    <span className="font-medium text-gray-900">{project.client}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500">Project Type</span>
                                    <span className="font-medium text-gray-900">{project.type}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500">Start Date</span>
                                    <span className="font-medium text-gray-900">{formatDate(project.startDate)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                Team
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500">Project Manager</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                            {project.manager ? project.manager[0].toUpperCase() : 'U'}
                                        </div>
                                        <span className="font-medium text-gray-900 capitalize">{project.manager || 'Unassigned'}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500">Contractor</span>
                                    <span className="font-medium text-gray-900 capitalize">{project.contractor || 'Unassigned'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Blueprints / Plans */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" />
                            Project Plans & Blueprints
                        </h3>

                        {project.blueprints && project.blueprints.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {project.blueprints.map((file, idx) => (
                                    <a
                                        key={idx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group block relative rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all bg-gray-50"
                                    >
                                        <div className="aspect-[4/5] bg-white flex items-center justify-center p-4">
                                            {/* Preview if image, else generic icon */}
                                            {file.type && file.type.startsWith('image/') ? (
                                                <img src={file.url} alt={file.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <FileText size={48} className="text-gray-300" />
                                            )}
                                        </div>

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <span className="bg-white text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                                                <Download size={14} /> View
                                            </span>
                                        </div>

                                        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 p-3">
                                            <p className="text-xs font-bold text-gray-800 line-clamp-1">{file.name}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                                <p className="text-gray-400 text-sm">No plans uploaded for this project.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsModal;
