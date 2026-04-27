import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const FaceScanner = ({ onScan, onCancel, title = "Identity Verification" }) => {
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelsLoaded(true);
            } catch (err) {
                setError(`Failed to load biometric models: ${err.message}`);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        if (isModelsLoaded) {
            startVideo();
        }
        return () => stopVideo();
    }, [isModelsLoaded]);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => {
                setError(`Camera access denied: ${err.message}`);
                console.error(err);
            });
    };

    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };

    const captureFace = async () => {
        if (!videoRef.current) return;
        setLoading(true);
        setError('');
        try {
            const detection = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (detection) {
                onScan(Array.from(detection.descriptor));
            } else {
                setError("No face detected. Please center your face.");
                setLoading(false);
            }
        } catch (err) {
            setError("Biometric processing error.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#05050A] border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>

                <h3 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">{title}</h3>
                <p className="text-slate-500 text-center mb-8 text-xs font-bold uppercase tracking-widest">Biometric Security Gateway</p>

                <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 mb-8 group">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale opacity-80" />
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>

                    {/* Face Frame Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-64 border-2 border-indigo-500/30 rounded-[3rem] border-dashed"></div>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Initializing...</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-center">
                        {error}
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 bg-white/5 border border-white/5 text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={captureFace}
                        disabled={loading || !isModelsLoaded}
                        className="flex-[2] py-4 bg-indigo-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Verify Identity
                    </button>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan {
                  0% { top: 0; opacity: 0; }
                  20% { opacity: 1; }
                  80% { opacity: 1; }
                  100% { top: 100%; opacity: 0; }
                }
            `}} />
        </div>
    );
};

export default FaceScanner;
