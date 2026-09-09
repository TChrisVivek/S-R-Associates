import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, CheckCircle2, MonitorOff, Plane } from 'lucide-react';

const StatusPopover = ({ currentStatus, returnDate, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(currentStatus);
    const [leaveDate, setLeaveDate] = useState(returnDate ? new Date(returnDate).toISOString().split('T')[0] : '');
    const popoverRef = useRef(null);

    // Close popover if you click outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle the final save
    const handleSave = (newStatus, date = null) => {
        onStatusChange(newStatus, date);
        setIsOpen(false);
    };

    // Render the visible badge based on current state
    const renderActiveBadge = () => {
        if (currentStatus === 'On Leave') {
            const formattedDate = returnDate ? new Date(returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'Unknown';
            return (
                <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition whitespace-nowrap">
                    <Plane size={11} className="opacity-70" /> On Leave till {formattedDate} <ChevronDown size={11} className="opacity-50" />
                </span>
            );
        }
        if (currentStatus === 'Remote') {
            return (
                <span className="bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-purple-100 transition whitespace-nowrap">
                    <MonitorOff size={11} className="opacity-70" /> Remote <ChevronDown size={11} className="opacity-50" />
                </span>
            );
        }
        if (currentStatus === 'Off Duty') {
            return (
                <span className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-gray-200 transition whitespace-nowrap">
                    Off Duty <ChevronDown size={11} className="opacity-50" />
                </span>
            );
        }
        return (
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition whitespace-nowrap">
                <CheckCircle2 size={11} className="opacity-70" /> On Site <ChevronDown size={11} className="opacity-50" />
            </span>
        );
    };

    return (
        <div className="relative inline-block" ref={popoverRef}>

            {/* 1. The Clickable Badge */}
            <div onClick={() => setIsOpen(!isOpen)}>
                {renderActiveBadge()}
            </div>

            {/* 2. The Floating Popover Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">

                    <div className="p-2 space-y-1">
                        {/* Quick Actions */}
                        <button
                            onClick={() => handleSave('On Site')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${selectedStatus === 'On Site' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <CheckCircle2 size={16} className={selectedStatus === 'On Site' ? 'text-emerald-500' : 'text-gray-400'} /> On Site
                        </button>

                        <button
                            onClick={() => handleSave('Remote')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${selectedStatus === 'Remote' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <MonitorOff size={16} className={selectedStatus === 'Remote' ? 'text-purple-500' : 'text-gray-400'} /> Remote
                        </button>

                        <button
                            onClick={() => handleSave('Off Duty')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${selectedStatus === 'Off Duty' ? 'bg-gray-100 text-gray-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Off Duty
                        </button>

                        <button
                            onClick={() => setSelectedStatus('On Leave')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${selectedStatus === 'On Leave' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Plane size={16} className={selectedStatus === 'On Leave' ? 'text-amber-500' : 'text-gray-400'} /> On Leave...
                        </button>
                    </div>

                    {/* 3. The Date Picker (Only shows if 'On Leave' is clicked in the menu) */}
                    {selectedStatus === 'On Leave' && (
                        <div className="bg-amber-50/50 p-3 border-t border-amber-100">
                            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={11} /> Expected Return Date</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={leaveDate}
                                    onChange={(e) => setLeaveDate(e.target.value)}
                                    className="w-full text-sm p-1.5 border border-amber-200 rounded focus:outline-none focus:border-amber-400 bg-white"
                                />
                                <button
                                    onClick={() => handleSave('On Leave', leaveDate)}
                                    disabled={!leaveDate}
                                    className="bg-amber-500 text-white p-1.5 rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default StatusPopover;
