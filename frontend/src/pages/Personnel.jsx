import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText,
    Settings, Plus, Search, MapPin, Filter, Bell, Moon, Trash2, X, AlertTriangle, ChevronRight
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Personnel = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    // --- REAL DATA STATE ---
    const [personnel, setPersonnel] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast, ToastComponent } = useToast();

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');

    useEffect(() => {
        const updateCompanyDisplay = () => {
            const shortName = localStorage.getItem('companyShortName');
            if (shortName) {
                setCompanyName(shortName);
                setCompanyInitial(shortName[0].toUpperCase());
            } else {
                setCompanyName('BuildCore');
                setCompanyInitial('B');
            }
        };

        // Initial load
        updateCompanyDisplay();

        // Listen for updates from Settings page
        window.addEventListener('companyNameUpdated', updateCompanyDisplay);
        return () => window.removeEventListener('companyNameUpdated', updateCompanyDisplay);
    }, []);
    const [deleteId, setDeleteId] = useState(null); // ID of member to delete
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [newMember, setNewMember] = useState({
        name: '', role: '', email: '', phone: '+91 ', site: '', status: 'On Site'
    });

    // --- 1. FETCH DATA (READ) ---
    useEffect(() => {
        fetchPersonnel();
    }, []);

    const fetchPersonnel = async () => {
        setLoading(true);
        try {
            const response = await api.get('/personnel');
            setPersonnel(response.data);
        } catch (error) {
            console.error("Failed to fetch personnel:", error);
            showToast("Failed to load personnel data", "error");
        } finally {
            setLoading(false);
        }
    };

    // Phone Number Handler
    const handlePhoneChange = (e) => {
        const value = e.target.value;

        // Ensure +91 prefix stays
        if (!value.startsWith('+91 ')) {
            // If user deletes prefix, reset it or ignore
            if (value.startsWith('+91')) {
                // User deleted space
                setNewMember({ ...newMember, phone: '+91 ' });
            } else {
                // User deleted more
                setNewMember({ ...newMember, phone: '+91 ' });
            }
            return;
        }

        // Validate numbers only after prefix
        const numberPart = value.slice(4);
        if (!/^\d*$/.test(numberPart)) return;

        // Limit to 10 digits
        if (numberPart.length > 10) return;

        setNewMember({ ...newMember, phone: value });
    };

    // --- 2. ADD MEMBER (CREATE) ---
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            // Adding a default avatar for the new user, using ui-avatars as placeholder
            const payload = {
                ...newMember,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name)}&background=random`
            };

            const response = await api.post('/personnel', payload);

            if (response.status === 201) {
                const addedMember = response.data;
                // Update UI instantly without reloading the page
                setPersonnel([addedMember, ...personnel]);
                setIsAddModalOpen(false); // Close Modal
                setNewMember({ name: '', role: '', email: '', phone: '+91 ', site: '', status: 'On Site' }); // Reset form
                showToast("Team member added successfully!", "success");
            }
        } catch (error) {
            console.error("Error adding member:", error);
            showToast("Failed to add member. Please try again.", "error");
        }
    };

    // --- 3. DELETE MEMBER (DELETE) ---
    const confirmDelete = (id) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            await api.delete(`/personnel/${deleteId}`);
            // Remove from the UI instantly
            setPersonnel(personnel.filter(person => person._id !== deleteId));
            showToast("Team member removed successfully", "success");
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        } catch (error) {
            console.error("Error deleting member:", error);
            showToast("Failed to delete member", "error");
        }
    };

    // --- SEARCH FILTERING ---
    const filteredPersonnel = useMemo(() => {
        return personnel.filter(person => {
            const query = searchQuery.toLowerCase();
            return (
                (person.name && person.name.toLowerCase().includes(query)) ||
                (person.role && person.role.toLowerCase().includes(query)) ||
                (person.site && person.site.toLowerCase().includes(query))
            );
        });
    }, [searchQuery, personnel]);

    // UI Helpers
    const getStatusBadge = (status) => {
        switch (status) {
            case 'On Site': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold tracking-wide uppercase">On Site</span>;
            case 'Remote': return <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold tracking-wide uppercase">Remote</span>;
            case 'Off Duty': return <span className="px-3 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-bold tracking-wide uppercase">Off Duty</span>;
            default: return <span className="px-3 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-bold tracking-wide uppercase">{status}</span>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">
            {ToastComponent}

            {/* --- LEFT SIDEBAR (Reused) --- */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col z-20 hidden md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        {companyInitial}
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">{companyName}</span>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <NavItem icon={<LayoutDashboard size={22} />} text="Command Center" href="/" />
                    <NavItem icon={<FolderOpen size={22} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={22} />} text="Personnel" active href="/personnel" />
                    <NavItem icon={<PieChart size={20} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={20} />} text="Reports" href="/reports" />
                    <NavItem icon={<Settings size={20} />} text="Settings" href="/settings" />
                </nav>

                <div className="p-6 border-t border-slate-100/50">
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                        {currentUser?.profile_image ? (
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white ring-offset-2 transition-all group-hover:ring-blue-100">
                                <img src={currentUser.profile_image} alt={currentUser.username} />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 ring-2 ring-white ring-offset-2 transition-all group-hover:ring-blue-200">
                                {currentUser?.username?.[0] || 'U'}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold text-slate-800">{currentUser?.username || 'User'}</p>
                            <p className="text-xs text-slate-500 font-medium">{currentUser?.role || 'Guest'}</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none z-0" />

                {/* Header */}
                <header className="sticky top-0 z-10 px-10 py-6 flex justify-between items-center bg-slate-50/80 backdrop-blur-md border-b border-white/20">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Personnel</h1>
                        <p className="text-slate-500 font-medium">Manage team members, roles, and site assignments.</p>
                    </div>
                    <div className="flex items-center gap-6 z-10">
                        <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-slate-100">
                            <Bell size={22} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>
                    </div>
                </header>

                <div className="px-10 py-8 relative z-0">

                    {/* Toolbar */}
                    <div className="bg-white/70 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between mb-10">
                        {/* Search Input */}
                        <div className="flex items-center gap-4 px-2 w-full max-w-lg">
                            <div className="relative w-full group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search members, roles, or sites..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm text-slate-700 placeholder-slate-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                <Filter size={18} />
                                <span>Filter</span>
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Plus size={18} className="stroke-[3px]" /> Add Member
                            </button>
                        </div>
                    </div>

                    {/* --- DATA TABLE --- */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="py-5 px-8 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Name & Role</th>
                                    <th className="py-5 px-8 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Contact Information</th>
                                    <th className="py-5 px-8 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Site Assignment</th>
                                    <th className="py-5 px-8 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="py-5 px-8 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-12 text-center text-slate-500 font-medium">Loading directory...</td></tr>
                                ) : filteredPersonnel.length > 0 ? (
                                    filteredPersonnel.map((person) => (
                                        <tr key={person._id} className="hover:bg-slate-50/80 transition-colors group">
                                            {/* Name & Role */}
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <img src={person.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random`} alt={person.name} className="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{person.name}</p>
                                                        <p className="text-xs text-slate-500 font-medium">{person.role}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="py-5 px-8">
                                                <p className="text-sm font-semibold text-slate-700">{person.email}</p>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">{person.phone}</p>
                                            </td>

                                            {/* Site */}
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <MapPin size={16} className="text-slate-400" />
                                                    <span className="text-sm font-bold text-slate-700">{person.site}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-5 px-8">
                                                {getStatusBadge(person.status)}
                                            </td>

                                            {/* Action */}
                                            <td className="py-5 px-8 text-right">
                                                {/* Delete button appears on hover */}
                                                <button
                                                    onClick={() => confirmDelete(person._id)}
                                                    className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove Member"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="py-12 text-center text-slate-500 font-medium">No personnel found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* --- ADD MEMBER MODAL OVERLAY --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 backdrop-blur-sm bg-slate-900/20">
                    <div className="absolute inset-0 transition-opacity" onClick={() => setIsAddModalOpen(false)}></div>

                    {/* Glassmorphism Modal Content */}
                    <div className="relative bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center p-8 pb-4">
                            <h3 className="font-extrabold text-2xl text-slate-800 tracking-tight">Add Team Member</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-8 pt-4 space-y-6">
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={newMember.name}
                                        onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={newMember.email}
                                            onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                                        <input
                                            required
                                            type="tel"
                                            value={newMember.phone}
                                            onChange={handlePhoneChange}
                                            className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                            placeholder="+91 99999 99999"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Site Assignment</label>
                                    <input
                                        required
                                        type="text"
                                        value={newMember.site}
                                        onChange={e => setNewMember({ ...newMember, site: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                        placeholder="e.g. Skyline Plaza Tower"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role / Designation</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={newMember.role}
                                            onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer font-medium text-slate-800"
                                        >
                                            <option value="" disabled>Select a Role</option>
                                            <option value="Architect">Architect</option>
                                            <option value="Civil Engineer">Civil Engineer</option>
                                            <option value="Structural Engineer">Structural Engineer</option>
                                            <option value="Site Supervisor">Site Supervisor</option>
                                            <option value="Electrician">Electrician</option>
                                            <option value="Plumber">Plumber</option>
                                            <option value="Carpenter">Carpenter</option>
                                            <option value="Mason">Mason</option>
                                            <option value="Laborer">Laborer</option>
                                            <option value="Safety Officer">Safety Officer</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <ChevronRight size={16} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5"
                                >
                                    Save Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 backdrop-blur-sm bg-slate-900/20">
                    <div className="absolute inset-0 transition-opacity" onClick={() => setIsDeleteModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 transform transition-all scale-100 text-center border border-slate-100">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="text-red-500" size={28} />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Remove Team Member?</h3>
                        <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">Are you absolutely sure you want to remove this member? This action cannot be undone.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-5 py-3 text-slate-700 font-bold hover:bg-slate-50 bg-white border border-slate-200 rounded-xl transition-colors w-full"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-5 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all w-full transform hover:-translate-y-0.5"
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

// --- SUB COMPONENTS ---

const NavItem = ({ icon, text, active, href }) => (
    <a
        href={href || "#"}
        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active
            ? 'bg-blue-50/80 text-blue-700 shadow-sm font-semibold'
            : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
    >
        <span className={`${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors`}>
            {icon}
        </span>
        <span className="text-sm tracking-wide">{text}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
    </a>
);

export default Personnel;
