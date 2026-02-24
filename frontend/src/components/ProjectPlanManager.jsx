import React, { useState } from 'react';
import BlueprintCanvas from './BlueprintCanvas';
import api from '../api/axios';
import { useToast } from './Toast';

const ProjectPlanManager = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [mimeType, setMimeType] = useState(null);
    const [projectId] = useState('507f1f77bcf86cd799439011');
    const [blueprintId] = useState('507f1f77bcf86cd799439012');
    const { showToast, ToastComponent } = useToast();

    // Lifted State
    const [selectedPin, setSelectedPin] = useState(null);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('plan', file);

        try {
            // Show loading state here if desired
            const response = await api.post('/projects/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // The backend returns the URL of the converted image (or the original image)
            setSelectedImage(response.data.imageUrl);
            setMimeType('image/jpeg'); // Always treat as image now!
        } catch (error) {
            console.error("Upload failed", error);
            showToast("Failed to upload/convert plan.", "error");
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!selectedPin) return;
        try {
            await api.patch(`/pins/${selectedPin._id}/status`, { status: newStatus });
            // Ideally we update the pins list in child or force refresh. 
            // For this UI demo, we'll update the local selectedPin object to reflect change instantly
            setSelectedPin({ ...selectedPin, status: newStatus });

            // Force reload of pins in canvas? (Implementation dependant)
            // A better way would be centralizing state, but for now let's rely on re-clicking or optimistic update visual
            // To make it perfect, we'd pass `pins` down. 
            // We will address "Sync" in next iteration if needed.
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a', // Slate 900
            color: '#e2e8f0', // Slate 200
            fontFamily: "'Inter', sans-serif"
        }}>
            {ToastComponent}
            {/* Top Navigation Bar */}
            <div style={{
                height: '64px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                backgroundColor: '#1e293b', // Slate 800
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🏗️
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>BuildMaster Pro</h1>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Projects  ›  4500 Wilshire Blvd</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!selectedImage && (
                        <label style={{
                            backgroundColor: '#2563eb',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            border: '1px solid #3b82f6'
                        }}>
                            <span>Include Plan</span>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </label>
                    )}
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#475569', border: '2px solid #334155' }}></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left: Canvas Area (70-75%) */}
                <div style={{ flex: 3, position: 'relative', backgroundColor: '#020617' }}>
                    {selectedImage ? (
                        <BlueprintCanvas
                            imageUrl={selectedImage}
                            mimeType={mimeType}
                            projectId={projectId}
                            blueprintId={blueprintId}
                            onPinSelect={setSelectedPin}
                            activePinId={selectedPin?._id}
                        />
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b'
                        }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '500', color: '#e2e8f0' }}>No Blueprint Loaded</h2>
                            <p>Upload a plan to start managing site issues.</p>
                        </div>
                    )}
                </div>

                {/* Right: Sidebar Panel (25-30%) */}
                <div style={{
                    width: '380px',
                    backgroundColor: '#1e293b',
                    borderLeft: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column'
                }}>

                    {/* Sidebar Header / Project Overview */}
                    <div style={{ padding: '24px', borderBottom: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3b82f6', letterSpacing: '0.05em' }}>IN PROGRESS</span>
                        </div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>Level 2 Floor Plan</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem' }}>
                            <span>📍</span> 4500 Wilshire Blvd, LA
                        </div>
                    </div>

                    {/* Dynamic Content: Selected Pin OR List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                        {selectedPin ? (
                            // Selected Issue View
                            <div className="animate-fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>SELECTED ISSUE</span>
                                    <button
                                        onClick={() => setSelectedPin(null)}
                                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem' }}
                                    >✕ Close</button>
                                </div>

                                <div style={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    border: '1px solid #334155',
                                    marginBottom: '24px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '40px', height: '40px',
                                            borderRadius: '8px',
                                            background: selectedPin.status === 'Open' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: selectedPin.status === 'Open' ? '#ef4444' : '#10b981',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.25rem'
                                        }}>
                                            {selectedPin.status === 'Open' ? '!' : '✓'}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>{selectedPin.title}</h3>
                                            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>ID: #{selectedPin._id.slice(-6)}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {selectedPin.status === 'Open' ? (
                                            <button
                                                onClick={() => handleStatusUpdate('Closed')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Resolve Issue
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusUpdate('Open')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Reopen Issue
                                            </button>
                                        )}
                                        <button style={{ padding: '10px 14px', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>📷</button>
                                    </div>
                                </div>

                                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', marginBottom: '12px' }}>ACTIVITY</h4>
                                <div style={{ borderLeft: '2px solid #334155', paddingLeft: '16px', marginLeft: '8px' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem' }}>Issue marked as <strong style={{ color: selectedPin.status === 'Open' ? '#ef4444' : '#10b981' }}>{selectedPin.status}</strong></p>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Just now</span>
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem' }}>Pin created</p>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Original creation</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Default List View
                            <div>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', letterSpacing: '0.05em' }}>TASK CHECKLIST</h4>

                                <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                                    Select a pin on the blueprint to view details and manage status.
                                </p>

                                {/* Placeholder for list stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
                                    <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>--</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Open Issues</div>
                                    </div>
                                    <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>--</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Resolved</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Footer */}
                    <div style={{ padding: '16px', borderTop: '1px solid #334155', backgroundColor: '#0f172a' }}>
                        <button style={{
                            width: '100%',
                            padding: '12px',
                            background: 'transparent',
                            border: '1px solid #3b82f6',
                            color: '#3b82f6',
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}>
                            + New Observation
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProjectPlanManager;
