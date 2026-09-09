import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from './Toast';

const styles = {
    viewport: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    stage: {
        position: 'relative',
        transformOrigin: 'center center',
        transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box'
    },
    image: {
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block',
        objectFit: 'contain',
        backgroundColor: 'white'
    },
    pin: {
        position: 'absolute',
        width: '24px',
        height: '24px',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinInner: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
    },
    tooltip: {
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.9)',
        color: 'white',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        marginBottom: '8px',
        pointerEvents: 'none',
        zIndex: 20,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
    },
    modal: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#1e293b',
        color: 'white',
        padding: '24px',
        border: '1px solid #334155',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        width: '320px'
    }
};

const BlueprintCanvas = ({ projectId, blueprintId, imageUrl, onPinSelect, activePinId }) => {
    const [pins, setPins] = useState([]);
    const [newPin, setNewPin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredPinId, setHoveredPinId] = useState(null);
    const stageRef = useRef(null);
    const [scale, setScale] = useState(1);
    const { showToast, ToastComponent } = useToast();

    useEffect(() => {
        const fetchPins = async () => {
            if (!blueprintId) return;
            try {
                const response = await api.get(`/pins/${blueprintId}`);
                setPins(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching pins:", error);
                setLoading(false);
            }
        };
        fetchPins();
    }, [blueprintId]);

    const handleContentClick = (e) => {
        if (newPin) return;

        const rect = stageRef.current.getBoundingClientRect();

        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            return;
        }

        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        setNewPin({ x: xPercent, y: yPercent, title: '' });

        if (onPinSelect) onPinSelect(null);
    };

    const savePin = async () => {
        if (!newPin.title) return showToast("Please add a title/note!", "warning");

        try {
            const payload = {
                project_id: projectId,
                blueprint_id: blueprintId,
                title: newPin.title,
                x_cord: newPin.x,
                y_cord: newPin.y,
                status: 'Open'
            };

            const response = await api.post('/pins', payload);
            setPins([...pins, response.data]);
            setNewPin(null);

            if (onPinSelect) onPinSelect(response.data);

        } catch (error) {
            console.error("Error saving pin:", error);
            showToast("Failed to save pin", "error");
        }
    };

    const displayUrl = imageUrl
        ? (imageUrl.includes('cloudinary.com') && imageUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? imageUrl.replace(/\.pdf$/i, '.jpg') : imageUrl)
        : "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000&auto=format&fit=crop";

    return (
        <div style={styles.viewport}>
            {ToastComponent}

            {/* The Zoomable Stage */}
            <div
                ref={stageRef}
                style={{
                    ...styles.stage,
                    transform: `scale(${scale})`
                }}
                onClick={handleContentClick}
            >
                <img
                    alt="Blueprint"
                    src={displayUrl}
                    style={styles.image}
                    draggable={false}
                />

                {/* Pins Overlay */}
                {pins.map(pin => {
                    const isActive = activePinId === pin._id;
                    const isHovered = hoveredPinId === pin._id;

                    return (
                        <div
                            key={pin._id}
                            style={{
                                ...styles.pin,
                                left: `${pin.x_cord}%`,
                                top: `${pin.y_cord}%`,
                                transform: `translate(-50%, -50%) scale(${isActive ? 1.5 : 1})`,
                                zIndex: isActive ? 30 : 10
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onPinSelect) onPinSelect(pin);
                            }}
                            onMouseEnter={() => setHoveredPinId(pin._id)}
                            onMouseLeave={() => setHoveredPinId(null)}
                        >
                            <div style={{
                                ...styles.pinInner,
                                backgroundColor: pin.status === 'Open' ? '#ef4444' : '#10b981',
                                borderColor: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                                boxShadow: isActive ? '0 0 0 4px rgba(59, 130, 246, 0.5)' : '0 2px 4px rgba(0,0,0,0.5)' // Halo
                            }} />

                            {(isHovered || isActive) && (
                                <span style={{
                                    ...styles.tooltip,
                                    transform: `translateX(-50%) scale(${1 / scale})`,
                                    transformOrigin: 'bottom center'
                                }}>
                                    {pin.title}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Creation Marker */}
                {newPin && (
                    <div style={{ ...styles.pin, left: `${newPin.x}%`, top: `${newPin.y}%`, opacity: 0.8 }}>
                        <div style={{ ...styles.pinInner, backgroundColor: '#3b82f6', borderColor: 'white' }} />
                    </div>
                )}
            </div>

            {/* Quick Creation Modal */}
            {newPin && (
                <div style={styles.modal}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>New Observation</h3>
                    <input
                        type="text"
                        placeholder="What's the issue?"
                        value={newPin.title}
                        onChange={(e) => setNewPin({ ...newPin, title: e.target.value })}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '10px',
                            marginBottom: '16px',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#0f172a',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setNewPin(null); }}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid #475569',
                                color: '#cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); savePin(); }}
                            style={{
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                            }}
                        >
                            Save Pin
                        </button>
                    </div>
                </div>
            )}

            {/* Zoom Controls */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: '12px',
                display: 'flex',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                border: '1px solid #334155',
                padding: '6px',
                backdropFilter: 'blur(8px)'
            }}>
                <button
                    style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '8px 16px', cursor: 'pointer', fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                    title="Zoom Out"
                >
                    －
                </button>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#94a3b8', fontSize: '0.9rem', borderLeft: '1px solid #475569', borderRight: '1px solid #475569', fontVariantNumeric: 'tabular-nums', minWidth: '60px', justifyContent: 'center' }}>
                    {Math.round(scale * 100)}%
                </div>
                <button
                    style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '8px 16px', cursor: 'pointer', fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => setScale(s => Math.min(4, s + 0.25))}
                    title="Zoom In"
                >
                    ＋
                </button>
            </div>
        </div>
    );
};

export default BlueprintCanvas;
