import { useRef } from 'react';
import { ImageIcon, RefreshCw, Upload } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui';

interface SlidePreviewProps {
  position: number;
  imageUrl?: string | null;
  isRendering?: boolean;
  onRender?: (position: number) => void;
  onUpload?: (position: number, file: File) => void;
  onPreview?: (position: number) => void;
  className?: string;
}

export function SlidePreview({
  position,
  imageUrl,
  isRendering = false,
  onRender,
  onUpload,
  onPreview,
  className,
}: SlidePreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    onUpload(position, file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Slide thumbnail container — aspect ratio 1:1 */}
      <div
        className={cn(
          'relative w-full aspect-square rounded-xl overflow-hidden border cursor-pointer',
          'transition-all duration-200',
          imageUrl
            ? 'border-brand-gray/20 hover:border-brand-blue/50'
            : 'border-dashed border-brand-gray/30 bg-white/3'
        )}
        onClick={() => {
          if (imageUrl && onPreview) onPreview(position);
        }}
      >
        {/* Rendered image */}
        {imageUrl && !isRendering && (
          <img
            src={imageUrl}
            alt={`Slide ${position}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Placeholder when no image */}
        {!imageUrl && !isRendering && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-10 h-10 text-brand-gray/30" />
            <span className="text-xs font-body text-brand-gray/50">Sem imagem</span>
          </div>
        )}

        {/* Loading overlay */}
        {isRendering && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-black/80">
            <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
            <span className="text-xs font-body text-brand-gray">Renderizando...</span>
          </div>
        )}

        {/* Position badge */}
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center shadow-lg">
          <span className="text-xs font-heading text-white">{position}</span>
        </div>

        {/* Hover controls overlay */}
        {!isRendering && (
          <div
            className={cn(
              'absolute inset-0 bg-brand-black/60 flex flex-col items-center justify-center gap-2',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {onRender && (
              <Button
                size="sm"
                variant="primary"
                className="w-36"
                onClick={() => onRender(position)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Re-renderizar
              </Button>
            )}
            {onUpload && (
              <Button
                size="sm"
                variant="ghost"
                className="w-36 border border-brand-gray/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
