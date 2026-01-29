
import React, { useRef } from 'react';

interface ImageUploaderProps {
  label: string;
  icon: string;
  onImageSelect: (base64: string, mimeType: string) => void;
  image: string | null;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  icon, 
  onImageSelect, 
  image,
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        onImageSelect(base64, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
      <div 
        onClick={() => inputRef.current?.click()}
        className={`relative aspect-[4/5] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300
          ${image ? 'border-2 border-indigo-500/50' : 'border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 bg-zinc-900/50 hover:bg-zinc-900'}
        `}
      >
        {image ? (
          <img src={image} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-500">
            <i className={`${icon} text-4xl`}></i>
            <span className="text-sm font-medium">Click to upload or drag</span>
          </div>
        )}
        <input 
          type="file" 
          ref={inputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
        {image && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] text-white">
            REPLACE
          </div>
        )}
      </div>
    </div>
  );
};
