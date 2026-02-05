import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2 } from 'lucide-react';

export function MiniAudioPlayer({ blob, url, onDelete, readOnly = false }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!blob && !url) return;

        const audioUrl = blob ? URL.createObjectURL(blob) : url;
        audioRef.current = new Audio(audioUrl);

        audioRef.current.onloadedmetadata = () => {
            if (audioRef.current.duration !== Infinity) {
                setDuration(audioRef.current.duration);
            }
        };

        audioRef.current.ondurationchange = () => {
            if (audioRef.current.duration !== Infinity) {
                setDuration(audioRef.current.duration);
            }
        };

        audioRef.current.ontimeupdate = () => {
            setCurrentTime(audioRef.current.currentTime);
        };

        audioRef.current.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
                if (blob) URL.revokeObjectURL(audioUrl);
            }
        };
    }, [blob, url]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
            <button
                type="button"
                onClick={togglePlay}
                className="w-6 h-6 flex items-center justify-center bg-emerald-600 rounded-full text-white hover:bg-emerald-700 transition-colors"
            >
                {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex flex-col min-w-[32px]">
                <span className="text-[10px] font-mono text-emerald-800 font-medium leading-none">
                    {formatTime(currentTime)}
                </span>
            </div>

            {!readOnly && onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="text-red-400 hover:text-red-600 p-1 ml-1"
                    title="Eliminar"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
}
