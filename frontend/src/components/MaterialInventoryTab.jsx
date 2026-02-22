import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Truck, BarChart2, AlertCircle,
    ClipboardList, Wallet, Box, Grid, Layers, Triangle, X, Loader2, UploadCloud, Calendar, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import api from '../api/axios';

const MaterialInventoryTab = ({ projectId }) => {
    const [inventoryData, setInventoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [selectedMaterialDetails, setSelectedMaterialDetails] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [selectedMaterialForUsage, setSelectedMaterialForUsage] = useState('');
    const [deliveryChallanFile, setDeliveryChallanFile] = useState(null);
    const [stackPhotoFile, setStackPhotoFile] = useState(null);
    const [usagePhotoFile, setUsagePhotoFile] = useState(null);

    // 1. Fetch Real Data
    useEffect(() => {
        fetchInventory();
    }, [projectId]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/inventory`);
            setInventoryData(response.data);
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Filter Logic
    const filteredMaterials = inventoryData?.materials?.filter(mat =>
        mat.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // 3. Action Handlers
    const handleLogDelivery = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            const formData = new FormData(e.target);

            // Add icon fallback based on unit if it's a new material
            const unit = formData.get('unit');
            let iconType = 'box';
            if (unit === 'BAGS') iconType = 'bag';
            if (unit === 'METRIC TONS') iconType = 'grid';
            if (unit === 'CUBIC FT') iconType = 'layers';
            if (unit === 'UNITS') iconType = 'brick';
            formData.append('iconType', iconType);

            await api.post(`/projects/${projectId}/materials/delivery`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await fetchInventory();
            setIsDeliveryModalOpen(false);
            setDeliveryChallanFile(null);
            setStackPhotoFile(null);
        } catch (error) {
            console.error("Failed to log delivery:", error);
            alert("Failed to log delivery. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogUsage = async (e) => {
        e.preventDefault();
        if (!selectedMaterialForUsage) return alert("Please select a material");

        setActionLoading(true);
        try {
            const formData = new FormData(e.target);
            formData.append('materialId', selectedMaterialForUsage);

            await api.post(`/projects/${projectId}/materials/usage`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await fetchInventory();
            setIsUsageModalOpen(false);
            setSelectedMaterialForUsage('');
            setUsagePhotoFile(null);
        } catch (error) {
            console.error("Failed to log usage:", error);
            alert("Failed to log usage. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    // Icon Helper based on material type
    const getMaterialIcon = (type) => {
        switch (type) {
            case 'bag': return <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Box size={20} /></div>;
            case 'grid': return <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Grid size={20} /></div>;
            case 'layers': return <div className="p-2 bg-yellow-50 text-yellow-500 rounded-lg"><Layers size={20} /></div>;
            case 'brick': return <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Triangle size={20} className="transform rotate-90" /></div>;
            default: return <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Box size={20} /></div>;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading Inventory Data...</div>;
    if (!inventoryData) return <div className="p-8 text-center text-red-500 font-medium">Failed to load data.</div>;

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* --- TOP TOOLBAR --- */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 w-1/2">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search materials (Cement, Sand, Steel...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
                        <Filter size={16} /> Filters
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDeliveryModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm shadow-emerald-500/30 transition-all">
                        <Truck size={18} /> Log Delivery
                    </button>
                    <button onClick={() => setIsUsageModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm shadow-indigo-500/30 transition-all">
                        <BarChart2 size={18} /> Log Usage
                    </button>
                </div>
            </div>

            {/* --- MAIN INVENTORY TABLE --- */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Material</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Total<br />Inflow</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Total<br />Outflow</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Current<br />Balance</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory<br />Value</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredMaterials.map((mat) => (
                                <tr key={mat.id}
                                    onClick={() => setSelectedMaterialDetails(mat)}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group relative"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            {getMaterialIcon(mat.iconType)}
                                            <div>
                                                <p className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">{mat.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{mat.unit}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center font-bold text-slate-700">{mat.inflow}</td>
                                    <td className="py-4 px-6 text-center font-bold text-slate-700">{mat.outflow}</td>
                                    <td className={`py-4 px-6 text-center font-black text-lg ${mat.status === 'LOW STOCK' ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {mat.balance}
                                    </td>
                                    <td className="py-4 px-6 font-bold text-slate-700">{mat.value}</td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${mat.status === 'LOW STOCK' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                            {mat.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredMaterials.length === 0 && (
                                <tr><td colSpan="6" className="py-8 text-center text-slate-500 font-bold">No materials found matching your search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center px-6">
                    <p className="text-xs font-bold text-slate-400 italic">Last updated: {inventoryData.lastUpdated}</p>
                    <p className="text-sm font-bold text-slate-900">Total Inventory Value: <span className="text-indigo-600 ml-2">{inventoryData.totalValue}</span></p>
                </div>
            </div>

            {/* --- SUMMARY CARDS (BOTTOM) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all group">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <ClipboardList size={28} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Orders</p>
                        <p className="text-2xl font-black text-slate-900">{inventoryData.summary.pendingOrders}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all group">
                    <div className="p-4 bg-red-50 text-red-500 rounded-xl group-hover:scale-110 transition-transform">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Out of Stock</p>
                        <p className="text-2xl font-black text-slate-900">{inventoryData.summary.outOfStock}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all group">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Inflow</p>
                        <p className="text-2xl font-black text-slate-900">{inventoryData.summary.monthlyInflow}</p>
                    </div>
                </div>

            </div>

            {/* --- MODALS --- */}
            {/* 1. Log Delivery Modal */}
            {isDeliveryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl my-8 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 flex flex-col border-b border-slate-100 bg-white relative">
                            <button type="button" onClick={() => { setIsDeliveryModalOpen(false); setDeliveryChallanFile(null); setStackPhotoFile(null); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-slate-900">Log Material Delivery</h3>
                            <p className="text-slate-500 text-sm mt-1">Record inflow details and upload visual proof</p>
                        </div>

                        <form onSubmit={handleLogDelivery} className="p-8 space-y-8 bg-slate-50/30">

                            {/* Section 1 */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold font-mono">1</div>
                                    <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Material & Quantity</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 px-9">
                                    <div className="md:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Material Type</label>
                                        <input type="text" name="materialName" list="materialsList" required placeholder="Select or type material" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" />
                                        <datalist id="materialsList">
                                            {inventoryData?.materials?.map(m => <option key={m.id} value={m.name} />)}
                                            <option value="Cement (OPC 53)" />
                                            <option value="Steel (TMT 12mm)" />
                                            <option value="Fine Sand (River)" />
                                        </datalist>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Quantity</label>
                                        <input type="number" name="quantity" step="0.01" required placeholder="0.00" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Unit</label>
                                        <select name="unit" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm appearance-none">
                                            <option value="BAGS">Bags</option>
                                            <option value="METRIC TONS">Tons</option>
                                            <option value="CUBIC FT">Cu Ft</option>
                                            <option value="UNITS">Units</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2 */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold font-mono">2</div>
                                    <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Supplier & Logistics</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-9">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Supplier Name</label>
                                        <input type="text" name="supplier" required placeholder="Search or enter supplier" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Total Cost (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                                            <input type="number" name="totalCost" required placeholder="0.00" className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3 File Uploads */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold font-mono">3</div>
                                    <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Undeniable Proof</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-9">
                                    <div className={`relative border-2 border-dashed ${deliveryChallanFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'} rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group overflow-hidden bg-white`}>
                                        <input type="file" name="deliveryChallan" accept="image/*,.pdf" onChange={(e) => setDeliveryChallanFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className={`w-10 h-10 ${deliveryChallanFile ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-blue-100'} rounded-full flex items-center justify-center mb-3 transition-colors`}>
                                            <ClipboardList className={`${deliveryChallanFile ? 'text-emerald-600' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`} size={20} />
                                        </div>
                                        <p className={`font-bold text-sm ${deliveryChallanFile ? 'text-emerald-700' : 'text-slate-700 group-hover:text-blue-700'} transition-colors`}>
                                            {deliveryChallanFile ? 'Challan Selected' : 'Delivery Challan'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1 truncate w-full px-4">
                                            {deliveryChallanFile ? deliveryChallanFile.name : 'Click or drag delivery document'}
                                        </p>
                                    </div>
                                    <div className={`relative border-2 border-dashed ${stackPhotoFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'} rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group overflow-hidden bg-white`}>
                                        <input type="file" name="stackPhoto" accept="image/*" onChange={(e) => setStackPhotoFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className={`w-10 h-10 ${stackPhotoFile ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-blue-100'} rounded-full flex items-center justify-center mb-3 transition-colors`}>
                                            <UploadCloud className={`${stackPhotoFile ? 'text-emerald-600' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`} size={20} />
                                        </div>
                                        <p className={`font-bold text-sm ${stackPhotoFile ? 'text-emerald-700' : 'text-slate-700 group-hover:text-blue-700'} transition-colors`}>
                                            {stackPhotoFile ? 'Photo Selected' : 'Material Stack Photo'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1 truncate w-full px-4">
                                            {stackPhotoFile ? stackPhotoFile.name : 'Clear photo of delivered items'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center px-9 pt-4 gap-4">
                                <button type="button" onClick={() => { setIsDeliveryModalOpen(false); setDeliveryChallanFile(null); setStackPhotoFile(null); }} className="flex-1 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading} className="flex-[2] py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Confirm Delivery"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Log Usage Modal */}
            {isUsageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg my-8 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 flex flex-col border-b border-slate-100 bg-white relative">
                            <button type="button" onClick={() => { setIsUsageModalOpen(false); setUsagePhotoFile(null); setSelectedMaterialForUsage(''); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-slate-900">Log Material Usage</h3>
                            <p className="text-slate-500 text-sm mt-1">Record material outflow for site operations</p>
                        </div>

                        <form onSubmit={handleLogUsage} className="p-8 space-y-6 bg-slate-50/30">

                            {/* Dynamic Stock Indicator */}
                            {selectedMaterialForUsage && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Box size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Current Stock Level</p>
                                            <p className="text-slate-700 font-medium text-sm">
                                                <span className="font-black text-lg text-slate-900 mr-1">
                                                    {inventoryData?.materials?.find(m => m.id === selectedMaterialForUsage)?.balance}
                                                </span>
                                                {inventoryData?.materials?.find(m => m.id === selectedMaterialForUsage)?.unit} Available
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-wider uppercase rounded">In Stock</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Select Material <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm appearance-none font-medium text-slate-700"
                                    value={selectedMaterialForUsage}
                                    onChange={(e) => setSelectedMaterialForUsage(e.target.value)}
                                >
                                    <option value="" disabled>Select a material...</option>
                                    {inventoryData?.materials?.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Usage Amount</label>
                                    <input type="number" name="quantity" step="0.01" required placeholder="0.00" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Unit</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={selectedMaterialForUsage ? inventoryData?.materials?.find(m => m.id === selectedMaterialForUsage)?.unit : ''}
                                        placeholder="Auto-filled"
                                        className="w-full px-4 py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl outline-none shadow-sm cursor-not-allowed font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Location / Purpose</label>
                                <textarea name="locationPurpose" rows="3" required placeholder="e.g. 2nd Floor Slab Pouring - Sector B" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm resize-none"></textarea>
                            </div>

                            <div className={`relative border-2 border-dashed ${usagePhotoFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'} rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group overflow-hidden bg-white mt-2`}>
                                <p className="absolute top-3 right-4 text-[10px] font-bold text-slate-300 uppercase">Optional</p>
                                <input type="file" name="usagePhoto" accept="image/*" onChange={(e) => setUsagePhotoFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className={`w-10 h-10 ${usagePhotoFile ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-indigo-100'} rounded-full flex items-center justify-center mb-3 transition-colors`}>
                                    <UploadCloud className={`${usagePhotoFile ? 'text-emerald-600' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} size={20} />
                                </div>
                                <p className={`font-bold text-sm ${usagePhotoFile ? 'text-emerald-700' : 'text-slate-700 group-hover:text-indigo-700'} transition-colors`}>
                                    {usagePhotoFile ? 'Photo Selected' : 'Click or drag to upload photo'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 truncate w-full px-4">
                                    {usagePhotoFile ? usagePhotoFile.name : 'PNG, JPG up to 10MB'}
                                </p>
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => { setIsUsageModalOpen(false); setUsagePhotoFile(null); setSelectedMaterialForUsage(''); }} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading} className="px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-70">
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Log Usage"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Material Details Modal */}
            {selectedMaterialDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-8 py-6 flex flex-col border-b border-slate-100 bg-white relative shrink-0">
                            <button onClick={() => setSelectedMaterialDetails(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-4">
                                {getMaterialIcon(selectedMaterialDetails.iconType)}
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedMaterialDetails.name}</h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <p className="text-slate-500 text-sm font-medium">Tracking Unit: <span className="font-bold text-slate-700 uppercase">{selectedMaterialDetails.unit}</span></p>
                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                        <p className="text-slate-500 text-sm font-medium">Valuation: <span className="font-bold text-indigo-600">{selectedMaterialDetails.value}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body - Logs Table */}
                        <div className="p-0 overflow-y-auto bg-slate-50/50 flex-1">
                            {(!selectedMaterialDetails.logs || selectedMaterialDetails.logs.length === 0) ? (
                                <div className="p-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <ClipboardList className="text-slate-300" size={32} />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-700">No History Found</h4>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm">There are no delivery or usage logs recorded for this material yet. Start by logging a delivery.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-white sticky top-0 shadow-sm z-10">
                                        <tr className="border-b border-slate-200">
                                            <th className="py-4 px-8 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-l border-slate-100">Details / Logistics</th>
                                            <th className="py-4 px-8 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Attachments</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {selectedMaterialDetails.logs.slice().reverse().map((log, index) => {
                                            const isDelivery = log.type === 'delivery';
                                            return (
                                                <tr key={log._id || index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-5 px-8 font-medium text-slate-600 whitespace-nowrap">
                                                        {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${isDelivery ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {isDelivery ? <Truck size={12} /> : <BarChart2 size={12} />}
                                                            {log.type}
                                                        </span>
                                                    </td>
                                                    <td className={`py-5 px-6 text-right font-black text-base ${isDelivery ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                        {isDelivery ? '+' : '-'}{log.quantity}
                                                    </td>
                                                    <td className="py-5 px-6 border-l border-slate-100">
                                                        {isDelivery ? (
                                                            <div>
                                                                <p className="font-bold text-slate-900">{log.supplier || 'Unknown Supplier'}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">Cost: <span className="font-medium text-slate-700">₹ {log.totalCost?.toLocaleString() || '0'}</span></p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="font-bold text-slate-900">{log.locationPurpose || 'General Site Usage'}</p>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-8 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {log.deliveryChallanUrl && (
                                                                <a href={log.deliveryChallanUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative" title="View Challan">
                                                                    <ExternalLink size={18} />
                                                                </a>
                                                            )}
                                                            {log.stackPhotoUrl && (
                                                                <a href={log.stackPhotoUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" title="View Stack Photo">
                                                                    <ImageIcon size={18} />
                                                                </a>
                                                            )}
                                                            {log.usagePhotoUrl && (
                                                                <a href={log.usagePhotoUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors group relative" title="View Usage Photo">
                                                                    <ImageIcon size={18} />
                                                                </a>
                                                            )}
                                                            {(!log.deliveryChallanUrl && !log.stackPhotoUrl && !log.usagePhotoUrl) && (
                                                                <span className="text-xs font-medium text-slate-300 italic">No File</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MaterialInventoryTab;
