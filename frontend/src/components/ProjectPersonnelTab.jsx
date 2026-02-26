import React, { useState, useEffect } from 'react';
import {
    Search, Mail, Phone, ArrowRight, Wrench, Zap, Ruler, X, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

import { useToast } from './Toast';

const ProjectPersonnelTab = ({ projectId }) => {
    const navigate = useNavigate();
    const { showToast, ToastComponent } = useToast();
    const [personnelData, setPersonnelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberToRemove, setMemberToRemove] = useState(null);

    // 1. Fetch Real Data
    useEffect(() => {
        fetchPersonnelData();

        const handlePersonnelUpdate = () => {
            fetchPersonnelData();
        };

        window.addEventListener('personnelUpdated', handlePersonnelUpdate);
        return () => window.removeEventListener('personnelUpdated', handlePersonnelUpdate);
    }, [projectId]);

    const fetchPersonnelData = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/personnel`);
            setPersonnelData(response.data);
        } catch (error) {
            console.error("Failed to fetch personnel data:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Real-time Search Filter for Internal Team
    const filteredTeam = personnelData?.internalTeam.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleRemovePersonnel = (memberId, memberName) => {
        setMemberToRemove({ id: memberId, name: memberName });
    };

    const confirmRemovePersonnel = async () => {
        if (!memberToRemove) return;

        try {
            // Update personnel to clear project_id and site
            await api.put(`/personnel/${memberToRemove.id}`, {
                project_id: null,
                site: 'Unassigned',
                status: 'Remote' // Or whatever default is appropriate
            });

            // Trigger refresh
            window.dispatchEvent(new Event('personnelUpdated'));

            // Show success toast
            showToast(`${memberToRemove.name} removed from site successfully`, "success");
        } catch (error) {
            console.error("Failed to remove personnel from site:", error);
            showToast("Failed to remove personnel from site. Please try again.", "error");
        } finally {
            setMemberToRemove(null);
        }
    };

    // UI Helpers
    const getStatusBadge = (status) => {
        switch (status) {
            case 'ON SITE': return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase">ON SITE</span>;
            case 'REMOTE': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase">REMOTE</span>;
            case 'ON LEAVE': return <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase">ON LEAVE</span>;
            default: return null;
        }
    };

    const getVendorIcon = (iconName) => {
        switch (iconName) {
            case 'wrench': return <Wrench size={24} className="text-gray-400" />;
            case 'zap': return <Zap size={24} className="text-gray-400" />;
            case 'ruler': return <Ruler size={24} className="text-gray-400" />;
            default: return <Wrench size={24} className="text-gray-400" />;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading Team Directory...</div>;
    if (!personnelData) return <div className="p-8 text-center text-red-500 font-medium">Failed to load data.</div>;

    return (
        <div className="flex flex-col h-full space-y-10">
            {ToastComponent}

            {/* --- SECTION 1: INTERNAL TEAM --- */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Project Internal Team</h2>
                        <p className="text-sm text-gray-500">Staff members specifically assigned to this project.</p>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search team..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredTeam.map(member => (
                        <div key={member.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                                {getStatusBadge(member.status)}
                            </div>

                            <div className="mb-6">
                                <h3 className="font-medium text-gray-900 text-lg">{member.name}</h3>
                                <p className="text-sm text-violet-500 font-medium">{member.role}</p>
                            </div>

                            <div className="space-y-3 mb-8 flex-1">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Mail size={16} className="text-gray-400" />
                                    <span className="truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Phone size={16} className="text-gray-400" />
                                    <span>{member.phone}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleRemovePersonnel(member.id, member.name)}
                                className="w-full py-2.5 bg-white border border-red-200 text-red-600 font-medium rounded-xl text-sm hover:bg-red-50 hover:border-red-300 transition shadow-sm flex items-center justify-center gap-2"
                            >
                                <X size={16} /> Remove from Site
                            </button>
                        </div>
                    ))}
                    {filteredTeam.length === 0 && (
                        <div className="col-span-full py-8 text-center text-gray-500">No team members match your search.</div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: EXTERNAL VENDORS --- */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">External Vendors</h2>
                        <p className="text-sm text-gray-500">Third-party specialized agencies and contractors</p>
                    </div>
                    <button
                        onClick={() => navigate('/personnel')}
                        className="text-sm font-medium text-violet-500 hover:underline flex items-center gap-1"
                    >
                        Manage Vendors <ArrowRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {personnelData.externalVendors.map(vendor => (
                        <div key={vendor.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-500 transition-colors">
                                    {getVendorIcon(vendor.icon)}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">{vendor.company}</h4>
                                    <div className="flex flex-col text-xs text-gray-500 mt-1">
                                        <span className="font-medium uppercase tracking-wider text-gray-400">TRADE: {vendor.trade}</span>
                                        <span className="flex items-center gap-1 mt-0.5 text-gray-600">👤 {vendor.contactPerson}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-full transition">
                                <Phone size={20} />
                            </button>
                        </div>
                    ))}
                    {personnelData.externalVendors.length === 0 && (
                        <div className="col-span-full py-8 text-center text-gray-500">No external vendors assigned.</div>
                    )}
                </div>
            </div>

            {/* --- SECTION 3: SUMMARY STATS BAR --- */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">

                <div className="text-center px-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Total Assigned</p>
                    <p className="text-4xl font-medium text-gray-900">{personnelData.stats.totalAssigned < 10 ? `0${personnelData.stats.totalAssigned}` : personnelData.stats.totalAssigned}</p>
                </div>

                <div className="text-center px-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Currently On-Site</p>
                    <p className="text-4xl font-medium text-emerald-600">{personnelData.stats.currentlyOnSite < 10 ? `0${personnelData.stats.currentlyOnSite}` : personnelData.stats.currentlyOnSite}</p>
                </div>

                <div className="text-center px-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">External Vendors</p>
                    <p className="text-4xl font-medium text-gray-900">{personnelData.stats.externalVendors < 10 ? `0${personnelData.stats.externalVendors}` : personnelData.stats.externalVendors}</p>
                </div>

                <div className="text-center px-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Safety Incidents</p>
                    <p className="text-4xl font-medium text-gray-900">{personnelData.stats.safetyIncidents < 10 ? `0${personnelData.stats.safetyIncidents}` : personnelData.stats.safetyIncidents}</p>
                </div>

            </div>

            {/* --- MEMBER PROFILE MODAL --- */}
            {selectedMember && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedMember(null)}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-gray-100">
                        {/* Header Gradient */}
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors backdrop-blur-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-8 pb-8">
                            {/* Profile Image - Overlapping Header */}
                            <div className="relative -mt-16 mb-4 flex justify-between items-end">
                                <div className="w-32 h-32 rounded-2xl bg-white p-1.5 shadow-lg border border-gray-100 relative">
                                    <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full rounded-xl object-cover" />
                                </div>
                                <div className="mb-2">
                                    {getStatusBadge(selectedMember.status)}
                                </div>
                            </div>

                            {/* Main Info */}
                            <div className="mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900">{selectedMember.name}</h2>
                                <p className="text-violet-500 font-medium tracking-wide mt-1">{selectedMember.role}</p>
                            </div>

                            {/* Details Grid */}
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-4 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-500 shrink-0">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Contact Email</p>
                                        <p className="text-gray-900 font-medium">{selectedMember.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Mobile Number</p>
                                        <p className="text-gray-900 font-medium">{selectedMember.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Assigned To</p>
                                        <p className="text-gray-900 font-medium">This Project</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                                >
                                    Close Profile
                                </button>
                                <button
                                    onClick={() => navigate('/personnel')}
                                    className="flex-1 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Full Directory
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- REMOVE CONFIRMATION MODAL --- */}
            {memberToRemove && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setMemberToRemove(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4 mx-auto">
                            <X size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">Remove Personnel</h3>
                        <p className="text-sm text-center text-gray-500 mb-6">
                            Are you sure you want to remove <span className="font-medium text-gray-900">{memberToRemove.name}</span> from this site?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMemberToRemove(null)}
                                className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemovePersonnel}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-sm shadow-sm"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProjectPersonnelTab;
