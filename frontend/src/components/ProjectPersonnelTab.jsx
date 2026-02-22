import React, { useState, useEffect } from 'react';
import {
    Search, Mail, Phone, ArrowRight, Wrench, Zap, Ruler
} from 'lucide-react';
import api from '../api/axios'; // Using the established Axios instance

const ProjectPersonnelTab = ({ projectId }) => {
    const [personnelData, setPersonnelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    // UI Helpers
    const getStatusBadge = (status) => {
        switch (status) {
            case 'ON SITE': return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase">ON SITE</span>;
            case 'REMOTE': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase">REMOTE</span>;
            case 'ON LEAVE': return <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase">ON LEAVE</span>;
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

            {/* --- SECTION 1: INTERNAL TEAM --- */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Project Internal Team</h2>
                        <p className="text-sm text-gray-500">Staff members specifically assigned to this project.</p>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search team..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
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
                                <h3 className="font-bold text-gray-900 text-lg">{member.name}</h3>
                                <p className="text-sm text-blue-600 font-medium">{member.role}</p>
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

                            <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm">
                                View Profile
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
                        <h2 className="text-lg font-bold text-gray-900">External Vendors</h2>
                        <p className="text-sm text-gray-500">Third-party specialized agencies and contractors</p>
                    </div>
                    <button className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                        Manage Vendors <ArrowRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {personnelData.externalVendors.map(vendor => (
                        <div key={vendor.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {getVendorIcon(vendor.icon)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">{vendor.company}</h4>
                                    <div className="flex flex-col text-xs text-gray-500 mt-1">
                                        <span className="font-bold uppercase tracking-wider text-gray-400">TRADE: {vendor.trade}</span>
                                        <span className="flex items-center gap-1 mt-0.5 text-gray-600">👤 {vendor.contactPerson}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition">
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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Assigned</p>
                    <p className="text-4xl font-bold text-gray-900">{personnelData.stats.totalAssigned < 10 ? `0${personnelData.stats.totalAssigned}` : personnelData.stats.totalAssigned}</p>
                </div>

                <div className="text-center px-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Currently On-Site</p>
                    <p className="text-4xl font-bold text-emerald-600">{personnelData.stats.currentlyOnSite < 10 ? `0${personnelData.stats.currentlyOnSite}` : personnelData.stats.currentlyOnSite}</p>
                </div>

                <div className="text-center px-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">External Vendors</p>
                    <p className="text-4xl font-bold text-gray-900">{personnelData.stats.externalVendors < 10 ? `0${personnelData.stats.externalVendors}` : personnelData.stats.externalVendors}</p>
                </div>

                <div className="text-center px-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Safety Incidents</p>
                    <p className="text-4xl font-bold text-gray-900">{personnelData.stats.safetyIncidents < 10 ? `0${personnelData.stats.safetyIncidents}` : personnelData.stats.safetyIncidents}</p>
                </div>

            </div>

        </div>
    );
};

export default ProjectPersonnelTab;
